import { productsPageSize } from "@/config/catalog";
import type { CatalogProduct } from "@/lib/catalog";
import type { CatalogCategory } from "@/lib/category";
import {
  getCategoryProducts,
  getCategoryStaticPaths,
  getProductCategories,
  getProductStaticPaths,
  getProductsPageStaticPaths,
  loadCategories,
  loadProducts,
} from "@/lib/content";
import type { ParsedProduct } from "@custom-web-builder/shared/catalog-schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCollection: vi.fn(),
  getEntries: vi.fn(),
}));

vi.mock("astro:content", () => mocks);

const baguette: ParsedProduct = {
  sku: "DULCE-HOGAR-BAGUETTE-001",
  name: "Baguette",
  price: 2.4,
  categories: ["Panes"],
  shortDescription: "Miga ligera.",
  mainImage: "/images/products/baguette.svg",
  images: ["/images/products/baguette.svg"],
};

const tart: ParsedProduct = {
  sku: "DULCE-HOGAR-TARTA-001",
  name: "Tarta de manzana",
  price: 18.5,
  categories: [],
  shortDescription: "Manzana caramelizada.",
  mainImage: "",
  images: [],
};

const products: CatalogProduct[] = [
  {
    ...baguette,
    id: "panes/baguette",
    categoryNames: ["Panes"],
    linkedCategories: [{ id: "panes", name: "Panes" }],
  },
  {
    ...tart,
    id: "pasteles/tarta-de-manzana",
    categoryNames: [],
    linkedCategories: [],
  },
];

const categories: CatalogCategory[] = [
  {
    id: "panes",
    name: "Panes",
    products: [{ ...baguette, id: "panes/baguette", categoryNames: ["Panes"] }],
  },
];

const collectionProductEntries = [
  {
    id: "panes/baguette",
    data: {
      ...baguette,
      categories: [{ collection: "categories", id: "panes" }],
    },
  },
  { id: "pasteles/tarta-de-manzana", data: { ...tart, categories: [] } },
];

const collectionCategoryEntries = [
  {
    id: "panes",
    data: {
      id: "panes",
      name: "Panes",
      products: [{ collection: "products", id: "panes/baguette" }],
    },
  },
];

const categoryNames: Record<string, string> = {
  panes: "Panes",
  pasteles: "Pasteles",
};

beforeEach(() => {
  mocks.getCollection.mockImplementation((name: string) =>
    Promise.resolve(
      name === "products"
        ? collectionProductEntries
        : collectionCategoryEntries,
    ),
  );
  mocks.getEntries.mockImplementation(
    (references: Array<{ collection: string; id: string }>) =>
      Promise.resolve(
        references.map((reference) =>
          reference.collection === "categories"
            ? {
                id: reference.id,
                data: { name: categoryNames[reference.id] ?? reference.id },
              }
            : {
                id: reference.id,
                data: {
                  ...baguette,
                  categories: [{ collection: "categories", id: "panes" }],
                },
              },
        ),
      ),
  );
});

describe("loadProducts", () => {
  it("reads products with their category names", async () => {
    expect(await loadProducts()).toEqual(products);
    expect(mocks.getCollection).toHaveBeenCalledWith("products");
  });
});

describe("loadCategories", () => {
  it("reads categories with their referenced products", async () => {
    expect(await loadCategories()).toEqual(categories);
    expect(mocks.getCollection).toHaveBeenCalledWith("categories");
  });

  it("skips references that do not resolve", async () => {
    mocks.getEntries.mockResolvedValueOnce([undefined]);

    expect(await loadCategories()).toEqual([
      { id: "panes", name: "Panes", products: [] },
    ]);
  });
});

describe("getProductCategories", () => {
  it("returns the categories referenced by a product", async () => {
    const referenced = await getProductCategories(
      collectionProductEntries[0] as never,
    );

    expect(referenced.map((category) => category.data.name)).toEqual(["Panes"]);
  });

  it("skips references that do not resolve", async () => {
    mocks.getEntries.mockResolvedValueOnce([undefined]);

    expect(
      await getProductCategories(collectionProductEntries[0] as never),
    ).toEqual([]);
  });
});

describe("getCategoryProducts", () => {
  it("returns the products referenced by a category", async () => {
    const products = await getCategoryProducts(
      collectionCategoryEntries[0] as never,
    );

    expect(products.map((product) => product.id)).toEqual(["panes/baguette"]);
  });

  it("skips references that do not resolve", async () => {
    mocks.getEntries.mockResolvedValueOnce([undefined]);

    expect(
      await getCategoryProducts(collectionCategoryEntries[0] as never),
    ).toEqual([]);
  });
});

describe("getProductStaticPaths", () => {
  it("builds one path per product with its resolved categories", async () => {
    const paths = await getProductStaticPaths();

    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatchObject({
      params: { id: "panes/baguette" },
      props: {
        product: { id: "panes/baguette", name: "Baguette" },
        categories: [{ id: "panes", name: "Panes" }],
      },
    });
    expect(paths[1]).toMatchObject({
      params: { id: "pasteles/tarta-de-manzana" },
      props: {
        product: { name: "Tarta de manzana" },
        categories: [],
      },
    });
  });
});

describe("getProductsPageStaticPaths", () => {
  it("paginates the products sorted for the requested locale", async () => {
    const paginate = (
      products: readonly CatalogProduct[],
      options: { pageSize: number },
    ) => [
      {
        params: { page: "1" },
        props: { products, pageSize: options.pageSize },
      },
    ];

    const paths = (await getProductsPageStaticPaths(
      "es",
      paginate as never,
    )) as unknown as Array<{
      props: { products: CatalogProduct[]; pageSize: number };
    }>;

    expect(paths[0]?.props.products.map((product) => product.name)).toEqual([
      "Baguette",
      "Tarta de manzana",
    ]);
    expect(paths[0]?.props.pageSize).toBe(productsPageSize);
  });
});

describe("getCategoryStaticPaths", () => {
  it("builds one path per category with the category as prop", async () => {
    const paths = await getCategoryStaticPaths();

    expect(paths).toEqual([
      {
        params: { id: "panes" },
        props: {
          category: expect.objectContaining({ id: "panes", name: "Panes" }),
        },
      },
    ]);
  });
});
