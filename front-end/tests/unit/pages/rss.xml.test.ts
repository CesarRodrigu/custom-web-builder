import { defaultLocale, hreflangCodes } from "@/config/site";
import { siteDescription, siteName } from "@/config/site-content";
import { GET } from "@/pages/rss.xml";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCollection: vi.fn(),
  rss: vi.fn((options: unknown) => options),
}));

vi.mock("astro:content", () => ({ getCollection: mocks.getCollection }));
vi.mock("@astrojs/rss", () => ({ default: mocks.rss }));

const productEntries = [
  {
    id: "panes/baguette",
    filePath: "src/content/products/panes/baguette.json",
    data: {
      name: "Baguette",
      shortDescription: "Miga ligera y corteza fina.",
      longDescription: "Fermentación lenta de masa madre.",
    },
  },
  {
    id: "pasteles/tarta-de-manzana",
    filePath: "src/content/products/pasteles/tarta-de-manzana.json",
    data: {
      name: "Tarta de manzana",
      shortDescription: "Manzana caramelizada.",
    },
  },
];

beforeEach(() => {
  mocks.getCollection.mockResolvedValue(productEntries);
});

describe("GET", () => {
  it("builds the feed with the site metadata and one item per product", async () => {
    const site = new URL("https://example.com");
    const feed = await GET({ site } as never);

    expect(feed).toEqual({
      title: siteName,
      description: siteDescription,
      site,
      items: [
        {
          title: "Baguette",
          description: "Fermentación lenta de masa madre.",
          link: `/${defaultLocale}/products/panes/baguette`,
        },
        {
          title: "Tarta de manzana",
          description: "Manzana caramelizada.",
          link: `/${defaultLocale}/products/pasteles/tarta-de-manzana`,
        },
      ],
      customData: `<language>${hreflangCodes[defaultLocale]}</language>`,
    });
  });

  it("falls back to a valid URL when the context has no site URL", async () => {
    const feed = await GET({} as never);

    expect(feed).toMatchObject({ site: new URL("http://localhost:4321") });
  });
});
