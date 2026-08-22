import { afterEach, describe, expect, it, vi } from "vitest";

import { recallSchool, rememberSchool, SCHOOL_SLUG_KEY, schoolSlugFor } from "./school";

/**
 * Which school a pre-login page should wear.
 *
 * This identifies nobody and authorises nothing, and the tests are mostly about
 * what it refuses to do: keep junk, trust a stored value it did not write, or
 * let a broken localStorage take the sign-in page down with it.
 */

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("rememberSchool", () => {
  it("keeps a real slug", () => {
    rememberSchool("sunrise");
    expect(window.localStorage.getItem(SCHOOL_SLUG_KEY)).toBe("sunrise");
  });

  it("ignores anything that is not one of ours", () => {
    for (const junk of ["", "  ", "Sunrise School", "../etc", "<script>", "-leading-dash"]) {
      rememberSchool(junk);
    }
    expect(window.localStorage.getItem(SCHOOL_SLUG_KEY)).toBeNull();
  });

  it("survives storage that refuses to write", () => {
    // Private browsing, quota, storage switched off. Forgetting which school it
    // was costs a neutral sign-in screen; it must never cost the sign-in.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => rememberSchool("sunrise")).not.toThrow();
  });
});

describe("recallSchool", () => {
  it("returns what was stored", () => {
    rememberSchool("sunrise");
    expect(recallSchool()).toBe("sunrise");
  });

  it("refuses a stored value it would not have written", () => {
    // Something else — an extension, an older build, a person with devtools —
    // could have put anything under this key.
    window.localStorage.setItem(SCHOOL_SLUG_KEY, "javascript:alert(1)");
    expect(recallSchool()).toBeNull();
  });

  it("returns nothing rather than throwing when storage is unreadable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    expect(recallSchool()).toBeNull();
  });
});

describe("schoolSlugFor", () => {
  it("prefers the slug in the address", () => {
    rememberSchool("remembered");
    expect(schoolSlugFor("from-the-link")).toBe("from-the-link");
  });

  it("falls back to the remembered one when the address carries none", () => {
    rememberSchool("remembered");
    expect(schoolSlugFor(null)).toBe("remembered");
    expect(schoolSlugFor("")).toBe("remembered");
  });

  it("lowercases what came from the address", () => {
    // A school pasting its own link into something that title-cases it should
    // still get its logo.
    expect(schoolSlugFor("Sunrise")).toBe("sunrise");
  });

  it("falls back rather than trusting junk in the address", () => {
    rememberSchool("remembered");
    expect(schoolSlugFor("not a slug")).toBe("remembered");
  });

  it("gives nothing when there is nothing — a neutral screen, not an error", () => {
    expect(schoolSlugFor(null)).toBeNull();
  });
});
