import { describe, expect, it } from "vitest";

import {
  IMAGE_URL_PATTERN,
  PRICE_PATTERN,
  SKU_PATTERN,
  ValidationCode,
  isEmptyOr,
  isFilled,
  isValidCategoryName,
  isValidFolderPath,
  isValidSku,
  matches,
  toValidationCode,
} from "@/catalog-schema/validation";

describe("isFilled", () => {
  it.each([
    {
      name: "accepts text with visible characters",
      value: "Baguette",
      expected: true,
    },
    {
      name: "accepts text surrounded by whitespace",
      value: "  Baguette  ",
      expected: true,
    },
    { name: "rejects an empty string", value: "", expected: false },
    { name: "rejects a whitespace-only string", value: "   ", expected: false },
  ])("$name", ({ value, expected }) => {
    expect(isFilled(value)).toBe(expected);
  });
});

describe("matches", () => {
  const matchesPrice = matches(PRICE_PATTERN);
  const matchesImageUrl = matches(IMAGE_URL_PATTERN);

  it.each([
    { name: "accepts an integer", value: "12", expected: true },
    {
      name: "accepts a price with a decimal point",
      value: "2.40",
      expected: true,
    },
    {
      name: "accepts a price with a decimal comma",
      value: "2,4",
      expected: true,
    },
    { name: "accepts zero", value: "0", expected: true },
    {
      name: "trims the value before matching",
      value: "  2.40  ",
      expected: true,
    },
    {
      name: "rejects more than two decimals",
      value: "2.400",
      expected: false,
    },
    { name: "rejects a negative price", value: "-2", expected: false },
    {
      name: "rejects a price with two separators",
      value: "2.4.5",
      expected: false,
    },
    { name: "rejects text", value: "gratis", expected: false },
    { name: "rejects a blank value", value: "", expected: false },
  ])("$name", ({ value, expected }) => {
    expect(matchesPrice(value)).toBe(expected);
  });

  it("accepts an HTTP image URL with surrounding whitespace", () => {
    expect(matchesImageUrl("  https://example.com/baguette.svg  ")).toBe(true);
  });

  it("rejects a non HTTP image URL", () => {
    expect(matchesImageUrl("ftp://example.com/baguette.svg")).toBe(false);
  });
});

describe("isEmptyOr", () => {
  const blankOrPrice = isEmptyOr(matches(PRICE_PATTERN));

  it.each([
    { name: "accepts a blank value", value: "", expected: true },
    { name: "accepts a whitespace-only value", value: "   ", expected: true },
    { name: "accepts a valid value", value: "2.40", expected: true },
    {
      name: "trims the value before applying the check",
      value: "  2,40  ",
      expected: true,
    },
    { name: "rejects an invalid value", value: "gratis", expected: false },
  ])("$name", ({ value, expected }) => {
    expect(blankOrPrice(value)).toBe(expected);
  });
});

describe("isValidCategoryName", () => {
  it.each([
    { name: "accepts a single label", value: "Panes", expected: true },
    {
      name: "trims the label before checking it",
      value: "  Panes  ",
      expected: true,
    },
    { name: "rejects an empty name", value: "", expected: false },
    { name: "rejects a whitespace-only name", value: "   ", expected: false },
    {
      name: "rejects a name containing a path separator",
      value: "Panes/Bollería",
      expected: false,
    },
  ])("$name", ({ value, expected }) => {
    expect(isValidCategoryName(value)).toBe(expected);
  });
});

describe("isValidFolderPath", () => {
  it.each([
    { name: "accepts a single folder", value: "dulces", expected: true },
    {
      name: "accepts a nested path",
      value: "dulces/tartas",
      expected: true,
    },
    {
      name: "accepts slugged labels with hyphens and digits",
      value: "productos-2/tartas-de-manzana",
      expected: true,
    },
    {
      name: "trims the value before checking it",
      value: "  dulces/tartas  ",
      expected: true,
    },
    { name: "rejects an empty path", value: "", expected: false },
    { name: "rejects a leading slash", value: "/dulces", expected: false },
    { name: "rejects a trailing slash", value: "dulces/", expected: false },
    {
      name: "rejects an empty segment",
      value: "dulces//tartas",
      expected: false,
    },
    {
      name: "rejects a parent segment",
      value: "dulces/../tartas",
      expected: false,
    },
    { name: "rejects a backslash", value: "dulces\\tartas", expected: false },
    {
      name: "rejects unslugged labels",
      value: "Dulces/Tartas",
      expected: false,
    },
  ])("$name", ({ value, expected }) => {
    expect(isValidFolderPath(value)).toBe(expected);
  });
});

describe("isValidSku", () => {
  it.each([
    {
      name: "accepts a generated code",
      value: "PANADERIA-TARTA-001",
      expected: true,
    },
    {
      name: "accepts digits in a group",
      value: "SKU-ITEM-002",
      expected: true,
    },
    {
      name: "trims the value before checking it",
      value: "  MARIA-001  ",
      expected: true,
    },
    {
      name: "rejects lowercase",
      value: "panaderia-tarta-001",
      expected: false,
    },
    {
      name: "rejects spaces inside a group",
      value: "PANADERIA TARTA-001",
      expected: false,
    },
    {
      name: "rejects an empty group",
      value: "PANADERIA--TARTA",
      expected: false,
    },
    { name: "rejects a trailing hyphen", value: "PANADERIA-", expected: false },
    { name: "rejects accents", value: "PANADERÍA-001", expected: false },
    { name: "rejects a blank value", value: "", expected: false },
  ])("$name", ({ value, expected }) => {
    expect(isValidSku(value)).toBe(expected);
  });

  it("stops at the first hyphen separated group boundary", () => {
    expect(SKU_PATTERN.test("A-1")).toBe(true);
    expect(SKU_PATTERN.test("A/1")).toBe(false);
  });
});

describe("toValidationCode", () => {
  it.each(Object.values(ValidationCode))(
    "maps the known code %s back to itself",
    (code) => {
      expect(toValidationCode(code)).toBe(code);
    },
  );

  it.each([
    { name: "an unknown message", message: "Invalid input" },
    { name: "an empty message", message: "" },
  ])("falls back to the required code for $name", ({ message }) => {
    expect(toValidationCode(message)).toBe(ValidationCode.Required);
  });

  it("keeps the validation codes stable", () => {
    expect(ValidationCode).toEqual({
      Required: "required",
      Email: "email",
      Price: "price",
      Url: "url",
      MainImage: "main-image",
      Category: "category",
      Folder: "folder",
      Duplicate: "duplicate",
      DuplicateCategory: "duplicate-category",
      Sku: "sku",
      DuplicateSku: "duplicate-sku",
    });
  });
});
