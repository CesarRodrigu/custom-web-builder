import {
  formatPrice,
  getProductImages,
  mergeCatalogProducts,
  sortProductsForDisplay,
  toCatalogProduct,
  toCategoryLabel,
  type CatalogProduct,
} from "@/lib/catalog";
import { ProductStatus } from "@custom-web-builder/shared/catalog-schema";
import { describe, expect, it } from "vitest";

describe("toCategoryLabel", () => {
  it.each([
    {
      name: "capitalizes a single-word category",
      segment: "pasteles",
      expected: "Pasteles",
    },
    {
      name: "replaces hyphens with spaces and capitalizes the first word",
      segment: "masa-madre",
      expected: "Masa madre",
    },
    {
      name: "returns an empty string for an empty segment",
      segment: "",
      expected: "",
    },
  ])("$name", ({ segment, expected }) => {
    expect(toCategoryLabel(segment)).toBe(expected);
  });
});

describe("toCatalogProduct", () => {
  it("adds the collection id to the document and keeps its categories", () => {
    const document = {
      name: "Tarta de manzana",
      price: 18.5,
      categories: ["Pasteles"],
      shortDescription: "Manzana caramelizada.",
      longDescription: "Manzana laminada sobre hojaldre crujiente.",
      stock: 4,
      status: ProductStatus.Recommended,
      imageUrl: "/images/products/tarta-de-manzana.svg",
    };

    expect(toCatalogProduct("p/tarta-de-manzana", document)).toEqual({
      id: "p/tarta-de-manzana",
      ...document,
    });
  });

  it("keeps the document categories even when the file sits in a subfolder", () => {
    expect(
      toCatalogProduct("p/empanada-gallega", {
        name: "Empanada gallega",
        price: 3.2,
        categories: ["Salados", "Galicia"],
      }),
    ).toEqual({
      id: "p/empanada-gallega",
      name: "Empanada gallega",
      price: 3.2,
      categories: ["Salados", "Galicia"],
    });
  });

  it("assigns every field read from the collection document", () => {
    const product = toCatalogProduct("b/baguette", {
      name: "Baguette",
      price: 2.4,
      categories: ["Panes"],
      shortDescription: "Miga ligera y corteza fina.",
      longDescription: "Corteza crujiente y miga aireada.",
      stock: 24,
      status: ProductStatus.Recommended,
    });

    expect(product).toMatchObject({
      shortDescription: "Miga ligera y corteza fina.",
      longDescription: "Corteza crujiente y miga aireada.",
      stock: 24,
      status: ProductStatus.Recommended,
      categories: ["Panes"],
    });
  });
});

describe("mergeCatalogProducts", () => {
  it("merges repeated documents of a product and keeps every category once", () => {
    const products: CatalogProduct[] = [
      {
        id: "p/tarta-de-manzana",
        name: "Tarta de manzana",
        price: 18.5,
        categories: ["Pasteles"],
      },
      {
        id: "o/tarta-de-manzana",
        name: "Tarta de manzana",
        price: 18.5,
        categories: ["Postres", "Pasteles"],
      },
      {
        id: "b/baguette",
        name: "Baguette",
        price: 2.4,
        categories: ["Panes"],
      },
    ];

    expect(mergeCatalogProducts(products)).toEqual([
      {
        id: "p/tarta-de-manzana",
        name: "Tarta de manzana",
        price: 18.5,
        categories: ["Pasteles", "Postres"],
      },
      {
        id: "b/baguette",
        name: "Baguette",
        price: 2.4,
        categories: ["Panes"],
      },
    ]);
  });

  it("does not mutate the categories of the input products", () => {
    const products: CatalogProduct[] = [
      {
        id: "p/tarta-de-manzana",
        name: "Tarta de manzana",
        price: 18.5,
        categories: ["Pasteles"],
      },
      {
        id: "o/tarta-de-manzana",
        name: "Tarta de manzana",
        price: 18.5,
        categories: ["Postres"],
      },
    ];

    mergeCatalogProducts(products);

    expect(products[0]?.categories).toEqual(["Pasteles"]);
  });
});

describe("sortProductsForDisplay", () => {
  const products: CatalogProduct[] = [
    { id: "tarta", name: "Tarta de manzana", price: 18.5, categories: [] },
    { id: "baguette", name: "Baguette", price: 2.4, categories: [] },
    { id: "croissant", name: "Croissant", price: 2.8, categories: [] },
  ];

  it("sorts the products by display name", () => {
    expect(
      sortProductsForDisplay(products, "es").map((product) => product.name),
    ).toEqual(["Baguette", "Croissant", "Tarta de manzana"]);
  });

  it("moves recommended products before the alphabetical order", () => {
    const withRecommended = products.map((product) =>
      product.name === "Tarta de manzana"
        ? { ...product, status: ProductStatus.Recommended }
        : product,
    );

    expect(
      sortProductsForDisplay(withRecommended, "es").map(
        (product) => product.name,
      ),
    ).toEqual(["Tarta de manzana", "Baguette", "Croissant"]);
  });

  it("puts products not for sale after the alphabetical order", () => {
    const withNotForSale = products.map((product) =>
      product.name === "Baguette"
        ? { ...product, status: ProductStatus.NotForSale }
        : product,
    );

    expect(
      sortProductsForDisplay(withNotForSale, "es").map(
        (product) => product.name,
      ),
    ).toEqual(["Croissant", "Tarta de manzana", "Baguette"]);
  });

  it("does not mutate the input array", () => {
    sortProductsForDisplay(products, "es");

    expect(products.map((product) => product.name)).toEqual([
      "Tarta de manzana",
      "Baguette",
      "Croissant",
    ]);
  });
});

describe("formatPrice", () => {
  it("formats the price with the locale separators and the euro symbol", () => {
    expect(formatPrice(18.5, "es")).toContain("18,50");
    expect(formatPrice(18.5, "en")).toContain("18.50");
    expect(formatPrice(18.5, "es")).toContain("€");
  });
});

describe("getProductImages", () => {
  it("returns the images array in gallery order without duplicates", () => {
    expect(
      getProductImages({
        imageUrl: "/images/cover.svg",
        images: ["/images/one.svg", "/images/two.svg", "/images/one.svg"],
      }),
    ).toEqual(["/images/one.svg", "/images/two.svg"]);
  });

  it("falls back to the single image when the array is empty", () => {
    expect(
      getProductImages({ imageUrl: "/images/cover.svg", images: [] }),
    ).toEqual(["/images/cover.svg"]);
  });

  it("returns no images when the product has no artwork", () => {
    expect(getProductImages({})).toEqual([]);
  });
});
