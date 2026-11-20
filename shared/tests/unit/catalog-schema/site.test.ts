import { describe, expect, it } from "vitest";

import { SiteTextField, siteMetaSchema } from "@/catalog-schema/site";
import { ValidationCode } from "@/catalog-schema/validation";

const completeSite = {
  name: "Dulce Hogar",
  description: "Panadería artesanal.",
  contactEmail: "hola@dulcehogar.example",
};

describe("siteMetaSchema", () => {
  it("accepts a site with only the required name", () => {
    expect(siteMetaSchema.parse({ name: "Dulce Hogar" })).toEqual({
      name: "Dulce Hogar",
    });
  });

  it("keeps the optional metadata when the export provides it", () => {
    expect(siteMetaSchema.parse(completeSite)).toEqual(completeSite);
  });

  it("rejects a site without a name", () => {
    expect(siteMetaSchema.safeParse({ description: "Panadería" }).success).toBe(
      false,
    );
  });

  it("accepts blank optional fields while editing", () => {
    const draft = { name: "Dulce Hogar", description: "", contactEmail: "" };

    expect(siteMetaSchema.safeParse(draft).success).toBe(true);
  });

  it("accepts a valid contact email with surrounding whitespace", () => {
    expect(
      siteMetaSchema.safeParse({
        ...completeSite,
        contactEmail: "  hola@dulcehogar.example  ",
      }).success,
    ).toBe(true);
  });

  it("rejects a blank name with the required code", () => {
    const result = siteMetaSchema.safeParse({ ...completeSite, name: "   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Required);
    }
  });

  it("rejects a malformed contact email with the email code", () => {
    const result = siteMetaSchema.safeParse({
      ...completeSite,
      contactEmail: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Email);
    }
  });
});

describe("SiteTextField", () => {
  it("keeps the text field names stable", () => {
    expect(SiteTextField).toEqual({
      Name: "name",
      Description: "description",
      ContactEmail: "contactEmail",
    });
  });
});
