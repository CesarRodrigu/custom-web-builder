import {
  site,
  siteContactEmail,
  siteDescription,
  siteName,
} from "@/config/site-content";
import { describe, expect, it } from "vitest";

describe("site content constants", () => {
  it("mirrors the metadata of the exported site", () => {
    expect(site).toEqual({
      name: "Dulce Hogar",
      description:
        "Panadería artesanal con masa madre, bollería y postres horneados cada día.",
      contactEmail: "hola@dulcehogar.example",
    });
  });

  it("builds the metadata object from the named constants", () => {
    expect(site).toEqual({
      name: siteName,
      description: siteDescription,
      contactEmail: siteContactEmail,
    });
  });
});
