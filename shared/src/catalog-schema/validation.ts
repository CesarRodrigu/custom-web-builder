/**
 * Validation vocabulary shared by the editor and the exported catalog.
 *
 * The draft a user edits is checked here so the same reason codes and the same
 * field shapes travel with the schemas wherever they are consumed. This module
 * holds only values and pure predicates; it imports no document schema, so
 * site, product and configuration schemas can all depend on it without a cycle.
 */
/** Pattern of a price typed by the user: digits with up to two decimals. */
export const PRICE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

/** Pattern of an HTTP(S) URL accepted for a product image. */
export const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/;

/**
 * Stable reason codes for draft issues: the same value is the message attached
 * to the Zod issue and the code the editor maps to a localized message.
 */
export const ValidationCode = {
  /** A required field is blank. */
  Required: "required",
  /** The contact email is malformed. */
  Email: "email",
  /** The price is not a non-negative number with up to two decimals. */
  Price: "price",
  /** The image URL is not an HTTP(S) URL. */
  Url: "url",
  /** A category name is blank or contains a path separator. */
  Category: "category",
  /** Another product of the catalog already uses the same name. */
  Duplicate: "duplicate",
} as const;

/** Stable reason code of one draft issue. */
export type ValidationCode =
  (typeof ValidationCode)[keyof typeof ValidationCode];

/** A single validation issue found in one field of the draft. */
export interface FieldIssue {
  /** Dot path of the offending field, e.g. `site.name` or `products.0.price`. */
  field: string;
  /** Code identifying the reason; the editor maps it to a localized message. */
  code: ValidationCode;
}

/**
 * Reports whether a raw draft value has visible text after trimming.
 * @param value Raw draft value.
 * @returns True when trimming leaves at least one character.
 */
export function isFilled(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Builds a predicate checking a raw value, trimmed, against a full-match pattern.
 * @param pattern Pattern the trimmed value must fully match.
 * @returns Predicate reporting whether the value matches.
 */
export function matches(pattern: RegExp): (value: string) => boolean {
  return (value) => pattern.test(value.trim());
}

/**
 * Builds a predicate turning a required styled check into an optional one: blank passes.
 * @param check Check applied to non blank values.
 * @returns Predicate passing blank values, applying `check` otherwise.
 */
export function isEmptyOr(
  check: (value: string) => boolean,
): (value: string) => boolean {
  return (value) => value.trim() === "" || check(value.trim());
}

/**
 * Reports whether a category name is a single non blank label.
 *
 * Categories are flat names now: a slash is rejected so a category can never
 * silently turn into a folder path inside a product document.
 * @param value Raw category name typed by the user.
 * @returns True when the name has text and no path separator.
 */
export function isValidCategoryName(value: string): boolean {
  const name = value.trim();
  return name.length > 0 && !name.includes("/");
}

/**
 * Reads a Zod issue message back as a stable validation code. Every rule of
 * the schemas emits one of the codes, so a message outside the known codes
 * means the value did not even match the field shape; it is reported as a
 * required issue so the field is still marked instead of passing silently.
 * @param message Message attached to the Zod issue.
 * @returns The matching validation code, or `required` as a fallback.
 */
export function toValidationCode(message: string): ValidationCode {
  return (
    Object.values(ValidationCode).find((code) => code === message) ??
    ValidationCode.Required
  );
}
