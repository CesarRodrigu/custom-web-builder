import {
  formatPrice,
  getProductImages,
  sortProductsForDisplay,
  toCatalogProduct,
  toCategoryLabel,
  type CatalogProduct,
} from "@/lib/catalog";
import { ProductStatus } from "@custom-web-builder/shared/catalog-schema";
import { describe, expect, it } from "vitest";

/** Short description carried by every parsed product document. */
const shortDescription = "Descripción breve";

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
      sku: "SKU-ITEM-001",
      name: "Tarta de manzana",
      price: 18.5,
      categories: ["Pasteles"],
      shortDescription: "Manzana caramelizada.",
      longDescription: "Manzana laminada sobre hojaldre crujiente.",
      stock: 4,
      status: ProductStatus.Recommended,
      mainImage: "/images/products/tarta-de-manzana.svg",
      images: ["/images/products/tarta-de-manzana.svg"],
    };

    expect(toCatalogProduct("p/tarta-de-manzana", document)).toEqual({
      id: "p/tarta-de-manzana",
      ...document,
    });
  });

  it("keeps the document categories even when the file sits in a subfolder", () => {
    expect(
      toCatalogProduct("p/empanada-gallega", {
        sku: "SKU-ITEM-001",
        name: "Empanada gallega",
        price: 3.2,
        categories: ["Salados", "Galicia"],
        shortDescription,
        mainImage: "",
        images: [],
      }),
    ).toEqual({
      id: "p/empanada-gallega",
      sku: "SKU-ITEM-001",
      name: "Empanada gallega",
      price: 3.2,
      categories: ["Salados", "Galicia"],
      shortDescription,
      mainImage: "",
      images: [],
    });
  });

  it("assigns every field read from the collection document", () => {
    const product = toCatalogProduct("b/baguette", {
      sku: "SKU-ITEM-001",
      name: "Baguette",
      price: 2.4,
      categories: ["Panes"],
      shortDescription: "Miga ligera y corteza fina.",
      longDescription: "Corteza crujiente y miga aireada.",
      stock: 24,
      status: ProductStatus.Recommended,
      mainImage: "",
      images: [],
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

describe("sortProductsForDisplay", () => {
  const products: CatalogProduct[] = [
    {
      id: "tarta",
      sku: "SKU-ITEM-001",
      name: "Tarta de manzana",
      price: 18.5,
      categories: [],
      shortDescription,
      mainImage: "",
      images: [],
    },
    {
      id: "baguette",
      sku: "SKU-ITEM-001",
      name: "Baguette",
      price: 2.4,
      categories: [],
      shortDescription,
      mainImage: "",
      images: [],
    },
    {
      id: "croissant",
      sku: "SKU-ITEM-001",
      name: "Croissant",
      price: 2.8,
      categories: [],
      shortDescription,
      mainImage: "",
      images: [],
    },
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
  it("returns the gallery in order without duplicates", () => {
    expect(
      getProductImages({
        mainImage: "",
        images: ["/images/one.svg", "/images/two.svg", "/images/one.svg"],
      }),
    ).toEqual(["/images/one.svg", "/images/two.svg"]);
  });

  it("puts the main image first", () => {
    expect(
      getProductImages({
        mainImage: "/images/two.svg",
        images: ["/images/one.svg", "/images/two.svg"],
      }),
    ).toEqual(["/images/two.svg", "/images/one.svg"]);
  });

  it("returns no images when the product has no artwork", () => {
    expect(getProductImages({ mainImage: "", images: [] })).toEqual([]);
  });
});
