import type { CatalogProduct } from "@/lib/catalog";
import {
  findProductCategories,
  getCategoryCoverImage,
  sortCategoriesByName,
  toCatalogCategory,
  withCategoryMemberships,
  withEnrichedCategoryProducts,
  type CatalogCategory,
} from "@/lib/category";
import type { ProductReference } from "@custom-web-builder/shared/catalog-schema";
import { describe, expect, it } from "vitest";

const baguette: CatalogProduct = {
  id: "panes/baguette",
  name: "Baguette",
  price: 2.4,
  categories: ["panes"],
  imageUrl: "/images/products/baguette.svg",
};

const sourdough: CatalogProduct = {
  id: "panes/pan-de-masa-madre",
  name: "Pan de masa madre",
  price: 6.5,
  categories: ["panes"],
};

const flan: CatalogProduct = {
  id: "postres/flan-de-huevo",
  name: "Flan de huevo",
  price: 4.5,
  categories: ["postres"],
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

/**
 * Builds the categories that reference both bread fixtures, used by the tests
 * that attach or swap category memberships.
 * @returns Fresh categories for panes and desayuno.
 */
function breadCategories(): CatalogCategory[] {
  return [
    categoryWith("panes", "Panes", [baguette, sourdough]),
    categoryWith("desayuno", "Desayuno", [baguette]),
  ];
}

/**
 * Builds the categories used to look up a product by name, including two that
 * reference the baguette and one that references nothing.
 * @returns Fresh categories for panes, salados and especialidades.
 */
function lookupCategories(): CatalogCategory[] {
  return [
    categoryWith("panes", "Panes", [baguette, sourdough]),
    categoryWith("salados", "Salados"),
    categoryWith("especialidades", "Especialidades", [baguette]),
  ];
}

describe("toCatalogCategory", () => {
  it("resolves the referenced products in document order", () => {
    const category = toCatalogCategory(
      "panes",
      {
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

  it("drops references to products missing from the export", () => {
    const category = toCatalogCategory(
      "panes",
      {
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

describe("withCategoryMemberships", () => {
  it("attaches every category that references each product", () => {
    expect(
      withCategoryMemberships([baguette, sourdough], breadCategories()).map(
        (product) => product.categoryNames,
      ),
    ).toEqual([["Panes", "Desayuno"], ["Panes"]]);
  });

  it("does not mutate the input products", () => {
    withCategoryMemberships(
      [baguette],
      [categoryWith("panes", "Panes", [baguette])],
    );

    expect(baguette.categoryNames).toBeUndefined();
  });

  it("returns the original product when no category references it", () => {
    const result = withCategoryMemberships(
      [flan],
      [categoryWith("panes", "Panes", [baguette])],
    );

    expect(result[0]).toBe(flan);
  });
});

describe("withEnrichedCategoryProducts", () => {
  it("swaps category products for their catalog counterpart", () => {
    const enrichedBaguette: CatalogProduct = {
      ...baguette,
      categoryNames: ["Panes", "Desayuno"],
    };
    const categories = breadCategories();

    const enriched = withEnrichedCategoryProducts(categories, [
      enrichedBaguette,
      sourdough,
    ]);

    expect(enriched[1].products[0].categoryNames).toEqual([
      "Panes",
      "Desayuno",
    ]);
    expect(categories[1].products[0].categoryNames).toBeUndefined();
  });

  it("keeps the resolved product when it is missing from the catalog", () => {
    const categories = [categoryWith("panes", "Panes", [sourdough])];

    expect(withEnrichedCategoryProducts(categories, [baguette])).toEqual(
      categories,
    );
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
      { ...sourdough, imageUrl: undefined },
      baguette,
    ]);

    expect(getCategoryCoverImage(category)).toBe(
      "/images/products/baguette.svg",
    );
  });

  it("returns undefined when no referenced product has artwork", () => {
    const category = categoryWith("panes", "Panes", [
      { ...sourdough, imageUrl: undefined },
    ]);

    expect(getCategoryCoverImage(category)).toBeUndefined();
  });
});

describe("findProductCategories", () => {
  const categories = lookupCategories();

  it("returns every category that references the product", () => {
    expect(
      findProductCategories(categories, baguette).map(
        (category) => category.name,
      ),
    ).toEqual(["Panes", "Especialidades"]);
  });

  it("matches the product by name when the ids differ", () => {
    expect(
      findProductCategories(categories, mergedBaguette).map(
        (category) => category.id,
      ),
    ).toEqual(["panes", "especialidades"]);
  });

  it("returns no categories when no category references the product", () => {
    expect(findProductCategories(categories, flan)).toEqual([]);
  });
});
