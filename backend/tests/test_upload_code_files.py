"""Homework in code can be handed in (specs/056).

The task said "send the code", and the upload answered "File type .py is not
allowed": the allowlist held pictures, office documents and a zip, and nothing
a programming course actually produces.
"""

import pytest

from app.common.file_validation import (
    SUBMISSION_EXTENSIONS,
    UploadValidationError,
    validate_upload,
)


def test_a_python_file_is_accepted():
    result = validate_upload(
        filename="hello.py",
        data=b'print("hi")\n',
        allowed_extensions=SUBMISSION_EXTENSIONS,
    )
    assert result.extension == ".py"
    assert result.verified_mime == "text/plain"
    # The stored name never carries the client's — that guard stays.
    assert result.safe_name.endswith(".py")
    assert "hello" not in result.safe_name


def test_an_executable_is_still_refused():
    with pytest.raises(UploadValidationError):
        validate_upload(
            filename="evil.exe",
            data=b"MZ\x90\x00",
            allowed_extensions=SUBMISSION_EXTENSIONS,
        )
