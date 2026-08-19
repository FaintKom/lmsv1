import { describe, expect, it } from "vitest";
import { buildTestCaseCsvTemplate, parseTestCaseCsv } from "./test-case-csv";

describe("parseTestCaseCsv", () => {
  it("parses plain rows", () => {
    const res = parseTestCaseCsv("input,expected_output,is_hidden\n1 2,3,false\n5 7,12,true\n");
    expect(res).toEqual({
      ok: true,
      cases: [
        { input: "1 2", expected_output: "3", is_hidden: false },
        { input: "5 7", expected_output: "12", is_hidden: true },
      ],
    });
  });

  it("honours quotes: commas and doubled quotes inside fields", () => {
    const res = parseTestCaseCsv('input,expected_output,is_hidden\n"a,b","say ""hi""",1\n');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cases[0].input).toBe("a,b");
      expect(res.cases[0].expected_output).toBe('say "hi"');
      expect(res.cases[0].is_hidden).toBe(true);
    }
  });

  it("tolerates BOM, CRLF and blank lines", () => {
    const res = parseTestCaseCsv("﻿input,expected_output\r\n\r\nx,y\r\n");
    expect(res).toEqual({
      ok: true,
      cases: [{ input: "x", expected_output: "y", is_hidden: false }],
    });
  });

  it("rejects the whole file when expected_output is missing", () => {
    const res = parseTestCaseCsv("input,output\nx,y\n");
    expect(res.ok).toBe(false);
  });

  it("rejects a row with an empty expected_output — nothing imports", () => {
    const res = parseTestCaseCsv("input,expected_output\nx,y\nz,\n");
    expect(res.ok).toBe(false);
  });

  it("rejects an unreadable is_hidden value", () => {
    const res = parseTestCaseCsv("input,expected_output,is_hidden\nx,y,maybe\n");
    expect(res.ok).toBe(false);
  });

  it("rejects an empty file and a header-only file", () => {
    expect(parseTestCaseCsv("").ok).toBe(false);
    expect(parseTestCaseCsv("input,expected_output\n").ok).toBe(false);
  });

  it("the template round-trips through the parser", () => {
    const res = parseTestCaseCsv(buildTestCaseCsvTemplate());
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.cases).toHaveLength(2);
  });
});
