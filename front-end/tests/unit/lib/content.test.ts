import { productsPageSize } from "@/config/catalog";
import type { CatalogProduct } from "@/lib/catalog";
import {
  getCategoryStaticPaths,
  getProductStaticPaths,
  getProductsPageStaticPaths,
  loadCatalog,
} from "@/lib/content";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCollection: vi.fn() }));

vi.mock("astro:content", () => mocks);

const productEntries = [
  {
    id: "panes/baguette",
    data: { name: "Baguette", price: 2.4, categories: ["Panes"] },
  },
  {
    id: "pasteles/tarta-de-manzana",
    data: { name: "Tarta de manzana", price: 18.5, categories: ["Pasteles"] },
  },
];

const categoryEntries = [
  {
    id: "panes",
    data: {
      name: "Panes",
      products: [{ collection: "products", id: "panes/baguette" }],
    },
  },
];

beforeEach(() => {
  mocks.getCollection.mockImplementation((name: string) =>
    Promise.resolve(name === "products" ? productEntries : categoryEntries),
  );
});

describe("loadCatalog", () => {
  it("reads products and categories from the exported collections", async () => {
    const catalog = await loadCatalog();

    expect(catalog.products.map((product) => product.name)).toEqual([
      "Baguette",
      "Tarta de manzana",
    ]);
    expect(catalog.categories.map((category) => category.name)).toEqual([
      "Panes",
    ]);
  });

  it("adds the collection id to every loaded product", async () => {
    const catalog = await loadCatalog();

    expect(catalog.products[0]?.id).toBe("panes/baguette");
    expect(catalog.categories[0]?.id).toBe("panes");
  });

  it("attaches category memberships to the products", async () => {
    const catalog = await loadCatalog();

    expect(catalog.products[0]?.categoryNames).toEqual(["Panes"]);
    expect(catalog.products[1]?.categoryNames).toBeUndefined();
  });

  it("enriches the category products with the merged catalog entries", async () => {
    const catalog = await loadCatalog();

    expect(catalog.categories[0]?.products[0]?.categoryNames).toEqual([
      "Panes",
    ]);
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
    )) as Array<{
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
