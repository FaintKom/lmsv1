"""File storage backends — local filesystem (default) or S3-compatible.

Supports AWS S3, Cloudflare R2, MinIO, Backblaze B2, and any other
S3-API-compatible service via boto3.

Public API:
    storage = get_storage()
    stored_path = storage.write(relative_path, data, content_type)
    data        = storage.read(relative_path)
    url         = storage.public_url(relative_path)  # may be None if private
    storage.delete(relative_path)

`relative_path` should look like `<org_id>/<lesson_id>/<filename>` — the
backends prepend their own root (a disk path for LocalFileStorage, a
bucket key prefix for S3FileStorage). Callers should never compose
absolute filesystem paths themselves.

Why the abstraction exists:
- Today: single VPS, uploads on local disk -> LocalFileStorage.
- Tomorrow: multi-instance behind a load balancer -> S3FileStorage with
  Cloudflare R2 (zero egress, ~$0.015/GB/month).
- The switch is one env var change (STORAGE_BACKEND=s3) plus filling in
  the S3_* credentials; no code changes in the endpoints that write
  files. Existing files are NOT migrated automatically — you can either
  leave them on disk (both backends can coexist for reads if you keep
  the old mount) or copy them with `aws s3 sync`.

Design notes:
- Both backends are sync because boto3 is sync and our file endpoints
  already read the full upload into memory via UploadFile.read(). For
  very large files we could switch to aioboto3, but current uploads are
  capped at 50 MB via the shared validator.
- public_url() returns the URL a browser can fetch the file from. For
  local storage this is a route served by the backend
  (/api/v1/courses/images/... already exists). For S3 it's either the
  bucket URL or a configured CDN base URL.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class FileStorage(ABC):
    @abstractmethod
    def write(self, relative_path: str, data: bytes, content_type: str | None = None) -> str:
        """Store `data` at `relative_path`. Returns an opaque handle the
        backend can later use to read/delete the file. For local storage
        this is the filesystem path; for S3 it's the key."""

    @abstractmethod
    def read(self, relative_path: str) -> bytes:
        """Return the bytes stored at `relative_path`."""

    @abstractmethod
    def delete(self, relative_path: str) -> None:
        """Delete the file at `relative_path`. No error if it doesn't exist."""

    @abstractmethod
    def public_url(self, relative_path: str) -> Optional[str]:
        """Return a URL a browser can fetch this file from, or None if the
        backend cannot produce one without signing."""


class LocalFileStorage(FileStorage):
    """Files live under `settings.upload_dir` on the local filesystem.

    This is what the app has used since inception. On the current prod
    deploy `upload_dir=/data/uploads` is a Docker volume mounted into the
    backend container.
    """

    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _abs(self, relative_path: str) -> Path:
        # Defence-in-depth: forbid path traversal
        rel = Path(relative_path)
        if rel.is_absolute() or ".." in rel.parts:
            raise ValueError(f"Invalid storage path: {relative_path}")
        return self.root / rel

    def write(self, relative_path: str, data: bytes, content_type: str | None = None) -> str:
        path = self._abs(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return str(path)

    def read(self, relative_path: str) -> bytes:
        return self._abs(relative_path).read_bytes()

    def delete(self, relative_path: str) -> None:
        try:
            self._abs(relative_path).unlink()
        except FileNotFoundError:
            pass

    def public_url(self, relative_path: str) -> Optional[str]:
        # No direct public URL — callers need to route through a backend
        # endpoint (e.g. /api/v1/courses/images/<name>).
        return None


class S3FileStorage(FileStorage):
    """S3-compatible storage via boto3. Works with AWS S3, Cloudflare R2,
    MinIO, Backblaze B2, DigitalOcean Spaces, etc.
    """

    def __init__(
        self,
        bucket: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        public_url_base: str = "",
    ):
        if not bucket:
            raise ValueError("S3FileStorage requires a bucket name")
        self.bucket = bucket
        self.public_url_base = public_url_base.rstrip("/")

        # Lazy-import boto3 so environments without it still load the module
        import boto3
        from botocore.config import Config as BotoConfig

        self._s3 = boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
            config=BotoConfig(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    def write(self, relative_path: str, data: bytes, content_type: str | None = None) -> str:
        extra = {}
        if content_type:
            extra["ContentType"] = content_type
        self._s3.put_object(
            Bucket=self.bucket,
            Key=relative_path,
            Body=data,
            **extra,
        )
        return f"s3://{self.bucket}/{relative_path}"

    def read(self, relative_path: str) -> bytes:
        obj = self._s3.get_object(Bucket=self.bucket, Key=relative_path)
        return obj["Body"].read()

    def delete(self, relative_path: str) -> None:
        try:
            self._s3.delete_object(Bucket=self.bucket, Key=relative_path)
        except Exception as e:
            logger.warning(f"S3 delete failed for {relative_path}: {e}")

    def public_url(self, relative_path: str) -> Optional[str]:
        if self.public_url_base:
            return f"{self.public_url_base}/{relative_path}"
        # No public base — caller should use a presigned URL instead
        return None

    def presigned_url(self, relative_path: str, expires_in: int = 3600) -> str:
        """Return a time-limited signed URL for private buckets."""
        return self._s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": relative_path},
            ExpiresIn=expires_in,
        )


_storage_instance: Optional[FileStorage] = None


def get_storage() -> FileStorage:
    """Return the configured file storage backend. Cached after first call."""
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    backend = (settings.storage_backend or "local").lower()
    if backend == "s3":
        _storage_instance = S3FileStorage(
            bucket=settings.s3_bucket,
            endpoint_url=settings.s3_endpoint_url,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key,
            region=settings.s3_region,
            public_url_base=settings.s3_public_url_base,
        )
        logger.info(
            f"File storage: S3 bucket={settings.s3_bucket} "
            f"endpoint={settings.s3_endpoint_url or 'default'}"
        )
    else:
        _storage_instance = LocalFileStorage(settings.upload_dir)
        logger.info(f"File storage: local path={settings.upload_dir}")

    return _storage_instance


def reset_storage_cache() -> None:
    """For tests — reset the cached singleton so fixtures can swap backends."""
    global _storage_instance
    _storage_instance = None
