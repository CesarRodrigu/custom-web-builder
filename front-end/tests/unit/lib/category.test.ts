import type { CatalogProduct } from "@/lib/catalog";
import {
  getCategoryCoverImage,
  sortCategoriesByName,
  toCatalogCategory,
  type CatalogCategory,
} from "@/lib/category";
import type { ProductReference } from "@custom-web-builder/shared/catalog-schema";
import { describe, expect, it } from "vitest";

const baguette: CatalogProduct = {
  id: "panes/baguette",
  sku: "DULCE-HOGAR-BAGUETTE-001",
  name: "Baguette",
  price: 2.4,
  categories: ["panes"],
  mainImage: "/images/products/baguette.svg",
  shortDescription: "Miga ligera.",
  images: ["/images/products/baguette.svg"],
};

const sourdough: CatalogProduct = {
  id: "panes/pan-de-masa-madre",
  sku: "DULCE-HOGAR-PAN-MASA-MADRE-001",
  name: "Pan de masa madre",
  price: 6.5,
  categories: ["panes"],
  shortDescription: "Fermentación lenta.",
  mainImage: "",
  images: [],
};

const mergedBaguette: CatalogProduct = {
  ...baguette,
  id: "ofertas/baguette",
};

const panesDescription = "Hogazas y barras de fermentación lenta.";

const productsById = new Map<string, CatalogProduct>([
  [baguette.id, baguette],
  [sourdough.id, sourdough],
]);

/**
 * Builds a renderable category out of the product fixtures, with no products
 * when the caller only needs its identity and name.
 * @param id Entry id of the category.
 * @param name Display name of the category.
 * @param products Products the category references.
 * @returns A new category holding the given products.
 */
function categoryWith(
  id: string,
  name: string,
  products: CatalogProduct[] = [],
): CatalogCategory {
  return { id, name, products };
}

/**
 * Builds the content reference a category document stores for one product.
 * @param id Entry id of the referenced product.
 * @returns A products-collection reference to that entry.
 */
function referenceTo(id: string): ProductReference {
  return { collection: "products", id };
}

describe("toCatalogCategory", () => {
  it("resolves the referenced products in document order", () => {
    const category = toCatalogCategory(
      "panes",
      {
        id: "panes",
        name: "Panes",
        description: panesDescription,
        products: [referenceTo(sourdough.id), referenceTo(baguette.id)],
      },
      productsById,
    );

    expect(category.products.map((product) => product.name)).toEqual([
      "Pan de masa madre",
      "Baguette",
    ]);
  });

  it("resolves plain product ids as well as collection references", () => {
    const category = toCatalogCategory(
      "panes",
      { id: "panes", name: "Panes", products: [baguette.id] },
      productsById,
    );

    expect(category.products).toEqual([baguette]);
  });

  it("drops references to products missing from the export", () => {
    const category = toCatalogCategory(
      "panes",
      {
        id: "panes",
        name: "Panes",
        products: [referenceTo(baguette.id), referenceTo("panes/missing")],
      },
      productsById,
    );

    expect(category.products).toEqual([baguette]);
    expect(category.description).toBeUndefined();
  });

  it("keeps the description when the document provides one", () => {
    const category = toCatalogCategory(
      "panes",
      {
        id: "panes",
        name: "Panes",
        description: panesDescription,
        products: [],
      },
      productsById,
    );

    expect(category.description).toBe(panesDescription);
  });

  it("lists a product once when several references resolve to it", () => {
    const duplicatedProducts = new Map(productsById);
    duplicatedProducts.set(mergedBaguette.id, mergedBaguette);

    const category = toCatalogCategory(
      "desayuno",
      {
        id: "desayuno",
        name: "Desayuno",
        products: [referenceTo(baguette.id), referenceTo(mergedBaguette.id)],
      },
      duplicatedProducts,
    );

    expect(category.products.map((product) => product.name)).toEqual([
      "Baguette",
    ]);
  });
});

describe("sortCategoriesByName", () => {
  it("sorts the categories by display name without mutating the input", () => {
    const categories = [
      categoryWith("postres", "Postres"),
      categoryWith("bolleria", "Bollería"),
      categoryWith("panes", "Panes"),
    ];

    expect(
      sortCategoriesByName(categories, "es").map((category) => category.name),
    ).toEqual(["Bollería", "Panes", "Postres"]);
    expect(categories.map((category) => category.name)).toEqual([
      "Postres",
      "Bollería",
      "Panes",
    ]);
  });
});

describe("getCategoryCoverImage", () => {
  it("returns the first image of the first product that has artwork", () => {
    const category = categoryWith("panes", "Panes", [
      { ...sourdough, mainImage: "", images: [] },
      baguette,
    ]);

    expect(getCategoryCoverImage(category)).toBe(
      "/images/products/baguette.svg",
    );
  });

  it("returns undefined when no referenced product has artwork", () => {
    const category = categoryWith("panes", "Panes", [
      { ...sourdough, mainImage: "", images: [] },
    ]);

    expect(getCategoryCoverImage(category)).toBeUndefined();
  });
});
