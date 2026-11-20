import { locales } from "@/config/site";
import { GET, getStaticPaths } from "@/pages/[locale]/products/[...slug].md";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
}));

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

const richEntry = {
  id: "rich/product",
  data: {
    name: "Rich product",
    price: 9.99,
    emptyNote: null,
    missingNote: undefined,
    tags: [],
    categories: ["Panes", "Postres"],
    ingredients: [
      { name: "Harina", amount: 1 },
      { name: "Agua", amount: 2 },
    ],
    nutrition: { calories: 250, fat: { saturated: 3 } },
    status: "recommended",
  },
};

const entriesById = new Map(
  [...productEntries, richEntry].map((entry) => [entry.id, entry]),
);

beforeEach(() => {
  mocks.getCollection.mockResolvedValue(productEntries);
  mocks.getEntry.mockImplementation((_collection: string, id: string) =>
    Promise.resolve(entriesById.get(id)),
  );
});

describe("getStaticPaths", () => {
  it("builds one Markdown path per locale and product", async () => {
    const paths = await getStaticPaths();

    expect(paths).toHaveLength(locales.length * productEntries.length);
    expect(paths[0]).toEqual({
      params: { locale: "es", slug: "panes/baguette" },
      props: { post: productEntries[0] },
    });
    expect(paths.at(-1)).toEqual({
      params: { locale: "en", slug: "pasteles/tarta-de-manzana" },
      props: { post: productEntries[1] },
    });
  });
});

describe("GET", () => {
  it("serializes the product as a Markdown document with a frontmatter header", async () => {
    const response = await GET({
      props: { post: { id: "panes/baguette" } },
    } as never);

    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    const body = await response.text();
    expect(body.startsWith("---\n")).toBe(true);
    expect(body.endsWith("\n---")).toBe(true);
    expect(body).toContain("**Name:** Baguette");
    expect(body).toContain("**Price:** 2.4");
    expect(body).toContain("## Categories");
    expect(body).toContain("- Panes");
  });

  it("renders nested objects and arrays and skips empty values", async () => {
    const response = await GET({
      props: { post: { id: "rich/product" } },
    } as never);

    const body = await response.text();
    expect(body).toContain("**Name:** Rich product");
    expect(body).toContain("**Price:** 9.99");
    expect(body).toContain("## Categories");
    expect(body).toContain("- Panes");
    expect(body).toContain("- Postres");
    expect(body).toContain("## Ingredients");
    expect(body).toContain("**Name:** Harina");
    expect(body).toContain("**Amount:** 1");
    expect(body).toContain("## Nutrition");
    expect(body).toContain("### Fat");
    expect(body).toContain("**Saturated:** 3");
    expect(body).not.toContain("Empty note");
    expect(body).not.toContain("Missing note");
    expect(body).not.toContain("Tags");
  });
});
