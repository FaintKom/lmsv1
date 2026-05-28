"""Child-safety: profanity screening + length caps on peer-visible text."""

import pytest
from pydantic import ValidationError

from app.auth.schemas import RegisterRequest, UserUpdate
from app.common.profanity import contains_profanity


def test_clean_text_passes():
    assert contains_profanity("Alex Smith") is False
    assert contains_profanity("I love math and robots") is False
    assert contains_profanity("") is False
    assert contains_profanity(None) is False


def test_obvious_profanity_blocked():
    assert contains_profanity("fuck you") is True
    assert contains_profanity("you are a bitch") is True


def test_obfuscation_normalised():
    assert contains_profanity("f u c k") is True
    assert contains_profanity("s.h.i.t") is True
    assert contains_profanity("SH1T") is True


def test_register_rejects_profane_name():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="fucker", email="a@b.com", password="x", role="student")


def test_register_rejects_overlong_name():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="A" * 101, email="a@b.com", password="x", role="student")


def test_register_accepts_clean_name():
    req = RegisterRequest(full_name="Alex Smith", email="a@b.com", password="x", role="student")
    assert req.full_name == "Alex Smith"


def test_user_update_rejects_profane_bio():
    with pytest.raises(ValidationError):
        UserUpdate(bio="this is shit")


def test_user_update_rejects_overlong_bio():
    with pytest.raises(ValidationError):
        UserUpdate(bio="x" * 281)


def test_user_update_allows_clean_and_none():
    assert UserUpdate(bio="I build robots").bio == "I build robots"
    assert UserUpdate().bio is None
