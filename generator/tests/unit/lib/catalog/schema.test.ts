import { describe, expect, it } from "vitest";

import {
  BLANK_PRICE,
  BLANK_STOCK,
  buildDefaultSku,
  CategoryEditorField,
  nextCategoryId,
  nextProductId,
  optionalField,
  OptionalTextField,
  parseSiteConfig,
  ProductEditorField,
  ProductStatus,
  removeCategoryFromProducts,
  removeProductFromCategory,
  renameCategoryInProducts,
  toFolderPath,
  toImageListInput,
  toImageListValue,
  toStockInput,
  toStockValue,
  toStatusValue,
  toDuplicateSkuIssues,
  toSkuValue,
  ValidationCode,
  withAutoSkus,
  withCompleteCategories,
  withFolderAncestors,
  type FieldIssue,
  type SiteConfig,
  type SiteConfigValidation,
} from "@/lib/catalog/schema";
import { draftWith, productWith } from "@tests/unit/helpers/fixtures";

/**
 * Asserts that a validation result is valid and returns its normalized
 * configuration, so tests can inspect the output without repeating the type
 * guard.
 * @param result Validation result under check.
 * @returns The normalized configuration carried by a valid result.
 */
function expectValidConfig(result: SiteConfigValidation): SiteConfig {
  expect(result.valid).toBe(true);
  return (result as Extract<SiteConfigValidation, { valid: true }>).config;
}

/**
 * Asserts that a validation result is invalid and returns its issues, so tests
 * can inspect them without repeating the type guard.
 * @param result Validation result under check.
 * @returns The issues carried by an invalid result.
 */
function expectInvalidIssues(result: SiteConfigValidation): FieldIssue[] {
  expect(result.valid).toBe(false);
  return (result as Extract<SiteConfigValidation, { valid: false }>).issues;
}

describe("optionalField", () => {
  it.each(Object.values(OptionalTextField))(
    "returns the trimmed value under %s",
    (key) => {
      expect(optionalField(key, "  Fresh bread  ")).toEqual({
        [key]: "Fresh bread",
      });
    },
  );

  it.each(["", "   ", undefined])(
    "omits an absent or blank value %j",
    (value) => {
      const result = optionalField(OptionalTextField.Description, value);

      expect(result).toEqual({});
      expect(result).not.toHaveProperty(OptionalTextField.Description);
    },
  );

  it("adds only the requested field to the record", () => {
    const result = optionalField(OptionalTextField.LongDescription, "a@b.com");

    expect(Object.keys(result)).toEqual([OptionalTextField.LongDescription]);
  });
});

describe("parseSiteConfig", () => {
  it("accepts a minimal draft and normalizes it into a valid configuration", () => {
    const result = parseSiteConfig(
      draftWith({
        site: {
          name: "  Panadería María  ",
          description: "   ",
          contactEmail: "",
        },
        products: [
          productWith({
            name: "  Tarta de manzana  ",
            categories: ["  Tartas  "],
            price: 19.99,
          }),
        ],
      }),
    );

    expect(expectValidConfig(result)).toEqual({
      site: { name: "Panadería María", description: "", contactEmail: "" },
      folders: [],
      categories: [],
      products: [
        {
          sku: "SKU-ITEM-001",
          name: "Tarta de manzana",
          categories: ["Tartas"],
          folder: "",
          price: 19.99,
          shortDescription: "Descripción breve",
          mainImage: "",
          images: [],
        },
      ],
    });
  });

  it("accepts filled optional fields and a decimal-point price", () => {
    const result = parseSiteConfig(
      draftWith({
        site: {
          name: "Bakery",
          description: "Fresh bread",
          contactEmail: "hello@bakery.com",
        },
        products: [
          productWith({
            name: "Bread",
            price: 0.5,
            shortDescription: "Whole grain",
            mainImage: "https://example.com/bread.jpg",
            images: ["https://example.com/bread.jpg"],
          }),
        ],
      }),
    );

    expect(expectValidConfig(result)).toEqual({
      site: {
        name: "Bakery",
        description: "Fresh bread",
        contactEmail: "hello@bakery.com",
      },
      folders: [],
      categories: [],
      products: [
        {
          sku: "SKU-ITEM-001",
          name: "Bread",
          categories: [],
          folder: "",
          price: 0.5,
          shortDescription: "Whole grain",
          mainImage: "https://example.com/bread.jpg",
          images: ["https://example.com/bread.jpg"],
        },
      ],
    });
  });

  it.each([
    {
      name: "a blank site name",
      draft: { site: { name: "   " } },
      issues: [{ field: "site.name", code: ValidationCode.Required }],
    },
    {
      name: "a site name that is not text",
      draft: { site: { name: 42 as unknown as string } },
      issues: [{ field: "site.name", code: ValidationCode.Required }],
    },
    {
      name: "a malformed contact email",
      draft: { site: { contactEmail: "not-an-email" } },
      issues: [{ field: "site.contactEmail", code: ValidationCode.Email }],
    },
    {
      name: "a product without a valid price",
      draft: {
        products: [productWith({ name: "Bread", price: BLANK_PRICE })],
      },
      issues: [{ field: "products.0.price", code: ValidationCode.Price }],
    },
    {
      name: "a price with more than two decimals",
      draft: {
        products: [productWith({ name: "Bread", price: 10.999 })],
      },
      issues: [{ field: "products.0.price", code: ValidationCode.Price }],
    },
    {
      name: "an image URL without an http scheme",
      draft: {
        products: [
          productWith({
            name: "Bread",
            price: 1.5,
            mainImage: "ftp://example.com/bread.jpg",
            images: ["ftp://example.com/bread.jpg"],
          }),
        ],
      },
      issues: [
        { field: "products.0.mainImage", code: ValidationCode.Url },
        { field: "products.0.images.0", code: ValidationCode.Url },
      ],
    },
    {
      name: "a main image that is not in the gallery",
      draft: {
        products: [
          productWith({
            name: "Bread",
            price: 1.5,
            mainImage: "/images/cover.jpg",
            images: ["/images/bread.jpg"],
          }),
        ],
      },
      issues: [
        { field: "products.0.mainImage", code: ValidationCode.MainImage },
      ],
    },
    {
      name: "a category name that contains a path separator",
      draft: {
        products: [
          productWith({
            name: "Bread",
            price: 2,
            categories: ["Dulces", "Tartas/Postres"],
          }),
        ],
      },
      issues: [
        { field: "products.0.categories.1", code: ValidationCode.Category },
      ],
    },
  ])("reports $name as a validation issue", ({ draft, issues }) => {
    const result = parseSiteConfig(draftWith(draft));

    expect(result).toEqual({ valid: false, issues });
  });

  it("reports a duplicate issue per product sharing the same trimmed name", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1, name: "  Pan  ", price: 2 }),
          productWith({ id: 2, name: "pan", price: 3 }),
          productWith({ id: 3, name: "Tarta", price: 1 }),
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        { field: "products.0.name", code: ValidationCode.Duplicate },
        { field: "products.1.name", code: ValidationCode.Duplicate },
      ],
    });
  });

  it("appends the duplicate issues after the schema issues", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1, name: "Pan" }),
          productWith({ id: 2, name: "PAN" }),
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        { field: "products.0.price", code: ValidationCode.Price },
        { field: "products.1.price", code: ValidationCode.Price },
        { field: "products.0.name", code: ValidationCode.Duplicate },
        { field: "products.1.name", code: ValidationCode.Duplicate },
      ],
    });
  });

  it("normalizes every category name and keeps the product in several categories", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({
            name: "Bread",
            categories: [" Dulces caseros ", "Postres"],
            price: 2,
          }),
        ],
      }),
    );

    expect(expectValidConfig(result).products[0]?.categories).toEqual([
      "Dulces caseros",
      "Postres",
    ]);
  });

  it("collects the issues of every offending field in schema order", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1 }),
          productWith({
            id: 2,
            categories: ["Dulces//Tartas"],
            price: 2,
          }),
        ],
      }),
    );

    expect(expectInvalidIssues(result).map((issue) => issue.field)).toEqual([
      "products.0.name",
      "products.0.price",
      "products.1.name",
      "products.1.categories.0",
    ]);
  });

  it("keeps the product id out of the exported configuration", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [productWith({ id: 7, name: "Bread", price: 2 })],
      }),
    );

    expect(expectValidConfig(result).products[0]).not.toHaveProperty("id");
  });

  it("rejects a product whose short description is blank", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({
            name: "Bread",
            price: 2,
            shortDescription: "   ",
          }),
        ],
      }),
    );

    expect(expectInvalidIssues(result)).toEqual([
      { field: "products.0.shortDescription", code: ValidationCode.Required },
    ]);
  });

  it("normalizes every optional product field declared by the schema", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({
            name: "Tarta",
            price: 2,
            shortDescription: "  Short text  ",
            longDescription: "  Long text  ",
            stock: 12,
            status: ProductStatus.Recommended,
            images: ["  /images/a.jpg  ", " ", "https://example.com/b.jpg"],
            mainImage: "https://example.com/b.jpg",
          }),
        ],
      }),
    );

    expect(expectValidConfig(result).products[0]).toEqual({
      sku: "SKU-ITEM-001",
      name: "Tarta",
      categories: [],
      folder: "",
      price: 2,
      shortDescription: "Short text",
      longDescription: "Long text",
      stock: 12,
      status: ProductStatus.Recommended,
      images: ["/images/a.jpg", "https://example.com/b.jpg"],
      mainImage: "https://example.com/b.jpg",
    });
  });
});

describe("product editor values", () => {
  it("exposes the schema fields and the fields added by the editor", () => {
    expect(ProductEditorField).toEqual({
      Sku: "sku",
      Name: "name",
      Price: "price",
      MainImage: "mainImage",
      ShortDescription: "shortDescription",
      LongDescription: "longDescription",
      Stock: "stock",
      Status: "status",
      Images: "images",
    });
  });

  it.each([
    { stock: undefined, expected: "" },
    { stock: BLANK_STOCK, expected: "" },
    { stock: 0, expected: "0" },
    { stock: 12, expected: "12" },
  ])("renders the stock $stock as $expected", ({ stock, expected }) => {
    expect(toStockInput(stock)).toBe(expected);
  });

  it.each([
    { value: "", expected: undefined },
    { value: "   ", expected: undefined },
    { value: "12", expected: 12 },
    { value: " 7 ", expected: 7 },
    { value: "1.5", expected: BLANK_STOCK },
    { value: "many", expected: BLANK_STOCK },
  ])("reads the stock text $value as $expected", ({ value, expected }) => {
    expect(toStockValue(value)).toBe(expected);
  });

  it.each([
    { value: "", expected: undefined },
    { value: ProductStatus.Recommended, expected: ProductStatus.Recommended },
    { value: ProductStatus.NotForSale, expected: ProductStatus.NotForSale },
    { value: "unknown", expected: undefined },
  ])("reads the status option $value as $expected", ({ value, expected }) => {
    expect(toStatusValue(value)).toBe(expected);
  });

  it("round trips the gallery through one reference per line", () => {
    const images = ["/images/a.jpg", "https://example.com/b.jpg"];
    expect(toImageListInput(images)).toBe(
      "/images/a.jpg\nhttps://example.com/b.jpg",
    );
    expect(
      toImageListValue("  /images/a.jpg  \n\nhttps://example.com/b.jpg "),
    ).toEqual(images);
  });

  it("reads an empty gallery as an empty list", () => {
    expect(toImageListInput(undefined)).toBe("");
    expect(toImageListValue("  \n  ")).toEqual([]);
  });
});

describe("nextProductId", () => {
  it.each([
    {
      name: "an empty catalog",
      products: [],
      expected: 1,
    },
    {
      name: "a catalog whose first product was deleted",
      products: [productWith({ id: 2 })],
      expected: 3,
    },
    {
      name: "a catalog with a gap between ids",
      products: [productWith({ id: 2 }), productWith({ id: 5 })],
      expected: 6,
    },
  ])("returns $expected for $name", ({ products, expected }) => {
    expect(nextProductId(products)).toBe(expected);
  });
});

describe("catalog folders", () => {
  it.each([
    { typed: "Dulces", expected: "dulces" },
    { typed: "Dulces/Tartas de manzana", expected: "dulces/tartas-de-manzana" },
    { typed: "  /Dulces//Tartas/  ", expected: "dulces/tartas" },
    { typed: "###", expected: "" },
  ])("normalizes $typed into $expected", ({ typed, expected }) => {
    expect(toFolderPath(typed)).toBe(expected);
  });

  it("adds the ancestors of a nested folder without duplicating them", () => {
    expect(withFolderAncestors(["dulces", "dulces/tartas", "salados"])).toEqual(
      ["dulces", "dulces/tartas", "salados"],
    );
    expect(withFolderAncestors(["dulces/tartas"])).toEqual([
      "dulces",
      "dulces/tartas",
    ]);
  });

  it("adds folder ancestors and keeps product assignments on validation", () => {
    const result = parseSiteConfig(
      draftWith({
        folders: ["dulces/tartas"],
        products: [
          productWith({
            name: "Tarta",
            price: 2,
            folder: "dulces/tartas",
          }),
        ],
      }),
    );

    expect(expectValidConfig(result)).toEqual({
      site: { name: "Panadería María", description: "", contactEmail: "" },
      folders: ["dulces", "dulces/tartas"],
      categories: [],
      products: [
        {
          sku: "SKU-ITEM-001",
          name: "Tarta",
          categories: [],
          folder: "dulces/tartas",
          price: 2,
          shortDescription: "Descripción breve",
          mainImage: "",
          images: [],
        },
      ],
    });
  });

  it("rejects a malformed folder path before generating anything", () => {
    const result = parseSiteConfig(
      draftWith({
        folders: ["Dulces"],
        products: [productWith({ name: "Bread", price: 2 })],
      }),
    );

    expect(expectInvalidIssues(result)).toEqual([
      { field: "folders.0", code: ValidationCode.Folder },
    ]);
  });
});

describe("product SKUs", () => {
  it.each([
    {
      name: "a site and a product name",
      siteName: "Panadería María",
      productName: "Tarta de manzana",
      taken: [],
      expected: "PANADERIA-TARTA-DE-MANZANA-001",
    },
    {
      name: "a product name with no slug",
      siteName: "Bakery",
      productName: "###",
      taken: [],
      expected: "BAKERY-ITEM-001",
    },
    {
      name: "no names at all",
      siteName: "",
      productName: "",
      taken: [],
      expected: "SKU-ITEM-001",
    },
    {
      name: "a code already taken by another product",
      siteName: "Bakery",
      productName: "Pan",
      taken: ["BAKERY-PAN-001"],
      expected: "BAKERY-PAN-002",
    },
    {
      name: "a taken code typed in lowercase",
      siteName: "Bakery",
      productName: "Pan",
      taken: ["bakery-pan-001"],
      expected: "BAKERY-PAN-002",
    },
    {
      name: "a gap in the sequence",
      siteName: "Bakery",
      productName: "Pan",
      taken: ["BAKERY-PAN-001", "BAKERY-PAN-003"],
      expected: "BAKERY-PAN-002",
    },
  ])(
    "builds $expected for $name",
    ({ siteName, productName, taken, expected }) => {
      expect(buildDefaultSku(siteName, productName, taken)).toBe(expected);
    },
  );

  it.each([
    { value: " tarta manzana ", expected: "TARTA-MANZANA" },
    { value: "mi-codigo", expected: "MI-CODIGO" },
    { value: "  sku 7  ", expected: "SKU-7" },
  ])("normalizes the typed SKU $value", ({ value, expected }) => {
    expect(toSkuValue(value)).toBe(expected);
  });

  it("keeps manual SKUs and gives each automatic product a free code", () => {
    const draft = draftWith({
      site: { name: "Bakery" },
      products: [
        {
          ...productWith({ id: 1, name: "Apple pie" }),
          sku: "",
          skuAuto: true,
        },
        productWith({
          id: 2,
          name: "Coffee",
          sku: "BAKERY-APPLE-PIE-001",
        }),
        {
          ...productWith({ id: 3, name: "Apple pie" }),
          sku: "",
          skuAuto: true,
        },
      ],
    });

    const products = withAutoSkus(draft).products;

    expect(products.map((product) => product.sku)).toEqual([
      "BAKERY-APPLE-PIE-002",
      "BAKERY-APPLE-PIE-001",
      "BAKERY-APPLE-PIE-003",
    ]);
    expect(products[1]?.skuAuto).toBe(false);
  });

  it("reports a duplicate issue on every product sharing a SKU", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1, name: "Pan", price: 2, sku: "SKU-ITEM-001" }),
          productWith({
            id: 2,
            name: "Tarta",
            price: 3,
            sku: " SKU-ITEM-001 ",
          }),
          productWith({ id: 3, name: "Cafe", price: 1, sku: "SKU-ITEM-003" }),
        ],
      }),
    );

    expect(expectInvalidIssues(result)).toEqual([
      { field: "products.0.sku", code: ValidationCode.DuplicateSku },
      { field: "products.1.sku", code: ValidationCode.DuplicateSku },
    ]);
    expect(toDuplicateSkuIssues(draftWith())).toEqual([]);
  });

  it("reports a malformed SKU with the sku code", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [productWith({ name: "Tarta", price: 2, sku: "pan tarta" })],
      }),
    );

    expect(expectInvalidIssues(result)).toEqual([
      { field: "products.0.sku", code: ValidationCode.Sku },
    ]);
  });

  it("rejects a draft product without a SKU", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [productWith({ name: "Tarta", price: 2, sku: undefined })],
      }),
    );

    expect(expectInvalidIssues(result)).toEqual([
      { field: "products.0.sku", code: ValidationCode.Required },
    ]);
  });
});

describe("ValidationCode", () => {
  it("keeps the codes stable so the editor messages do not break", () => {
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

describe("category helpers", () => {
  it("assigns a monotonically growing id to new categories", () => {
    expect(
      nextCategoryId([
        { id: 2, name: "Panes", description: "" },
        { id: 5, name: "Dulces", description: "" },
      ]),
    ).toBe(6);
    expect(nextCategoryId([])).toBe(1);
  });

  it("exposes the category fields as an enumeration", () => {
    expect(Object.values(CategoryEditorField)).toEqual(["name", "description"]);
  });

  it("adds a category row for each name used by the products", () => {
    const draft = draftWith({
      products: [productWith({ categories: ["Panes", " panes ", "Dulces"] })],
    });

    const complete = withCompleteCategories(draft);

    expect(complete.categories).toEqual([
      { id: 1, name: "Panes", description: "" },
      { id: 2, name: "Dulces", description: "" },
    ]);
  });

  it("keeps declared categories and only adds the missing ones", () => {
    const draft = draftWith({
      categories: [{ id: 7, name: "Panes", description: "Pan artesanal" }],
      products: [productWith({ categories: ["panes", "Dulces"] })],
    });

    const complete = withCompleteCategories(draft);

    expect(complete.categories).toEqual([
      { id: 7, name: "Panes", description: "Pan artesanal" },
      { id: 8, name: "Dulces", description: "" },
    ]);
  });

  it("rewrites the category name in every product when it is renamed", () => {
    const products = [
      productWith({ categories: ["Panes", "Dulces"] }),
      productWith({ id: 2, categories: [" panes "], folder: "panes" }),
    ];

    expect(
      renameCategoryInProducts(products, "panes", "Panes y bollería"),
    ).toEqual([
      { ...products[0], categories: ["Panes y bollería", "Dulces"] },
      { ...products[1], categories: ["Panes y bollería"] },
    ]);
  });

  it("leaves memberships untouched when the new name is blank", () => {
    const products = [productWith({ categories: ["Panes"] })];

    expect(renameCategoryInProducts(products, "Panes", "  ")).toEqual(products);
  });

  it("removes a category from every product when it is deleted", () => {
    const products = [
      productWith({ categories: ["Panes", "Dulces"] }),
      productWith({ id: 2, categories: ["PANES"] }),
    ];

    expect(removeCategoryFromProducts(products, "panes")).toEqual([
      { ...products[0], categories: ["Dulces"] },
      { ...products[1], categories: [] },
    ]);
  });

  it("removes one product from a category without dropping its other categories", () => {
    const products = [
      productWith({ categories: ["Panes", "Dulces"] }),
      productWith({ id: 2, categories: ["Panes"] }),
    ];

    expect(removeProductFromCategory(products, 0, "panes")).toEqual([
      { ...products[0], categories: ["Dulces"] },
      products[1],
    ]);
  });
});

describe("category validation and normalization", () => {
  it("normalizes declared category names and descriptions", () => {
    const result = parseSiteConfig(
      draftWith({
        categories: [
          { id: 1, name: "  Panes  ", description: "  Pan artesanal  " },
          { id: 2, name: "Dulces", description: "   " },
        ],
      }),
    );

    expect(expectValidConfig(result).categories).toEqual([
      { name: "Panes", description: "Pan artesanal" },
      { name: "Dulces" },
    ]);
  });

  it("reports duplicate category names with a stable code", () => {
    const result = parseSiteConfig(
      draftWith({
        categories: [
          { id: 1, name: "Panes", description: "" },
          { id: 2, name: "panes", description: "" },
        ],
      }),
    );

    expect(expectInvalidIssues(result)).toContainEqual({
      field: "categories.0.name",
      code: ValidationCode.DuplicateCategory,
    });
  });
});
