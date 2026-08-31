"""Recordings for listening exercises can be handed to the server (specs/068).

The AUDIO category was declared in `file_validation` long before any extension
belonged to it, so every mp3 came back "File type .mp3 is not allowed".
"""

import pytest

from app.common.file_validation import (
    AUDIO_EXTENSIONS,
    FileCategory,
    UploadValidationError,
    validate_upload,
)

# An mp3 either opens with an ID3 tag or straight with a frame sync.
ID3_MP3 = b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\x00" * 64
BARE_MP3 = b"\xff\xfb\x90\x00" + b"\x00" * 64


def test_an_mp3_with_an_id3_tag_is_accepted():
    result = validate_upload(
        filename="leccion-1.mp3",
        data=ID3_MP3,
        allowed_extensions=AUDIO_EXTENSIONS,
        category=FileCategory.AUDIO,
    )
    assert result.extension == ".mp3"
    assert result.verified_mime == "audio/mpeg"
    # The stored name never carries the client's.
    assert result.safe_name.endswith(".mp3")
    assert "leccion" not in result.safe_name


def test_an_mp3_without_a_tag_is_accepted():
    result = validate_upload(
        filename="track.mp3",
        data=BARE_MP3,
        allowed_extensions=AUDIO_EXTENSIONS,
        category=FileCategory.AUDIO,
    )
    assert result.verified_mime == "audio/mpeg"


def test_m4a_ogg_and_wav_are_accepted():
    cases = [
        ("a.m4a", b"\x00\x00\x00\x20ftypM4A " + b"\x00" * 32, "audio/mp4"),
        ("a.ogg", b"OggS\x00\x02" + b"\x00" * 32, "audio/ogg"),
        ("a.wav", b"RIFF\x24\x08\x00\x00WAVE" + b"\x00" * 32, "audio/wav"),
    ]
    for name, data, mime in cases:
        result = validate_upload(
            filename=name,
            data=data,
            allowed_extensions=AUDIO_EXTENSIONS,
            category=FileCategory.AUDIO,
        )
        assert result.verified_mime == mime, name


def test_an_executable_renamed_to_mp3_is_refused():
    with pytest.raises(UploadValidationError):
        validate_upload(
            filename="evil.mp3",
            data=b"MZ\x90\x00",
            allowed_extensions=AUDIO_EXTENSIONS,
            category=FileCategory.AUDIO,
        )


def test_a_picture_is_refused_where_a_recording_is_expected():
    """The category gate, not just the allowlist — a .png is a real file type."""
    with pytest.raises(UploadValidationError):
        validate_upload(
            filename="cover.png",
            data=b"\x89PNG\r\n\x1a\n" + b"\x00" * 32,
            allowed_extensions={".png", *AUDIO_EXTENSIONS},
            category=FileCategory.AUDIO,
        )
