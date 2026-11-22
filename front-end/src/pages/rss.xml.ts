import { defaultLocale, hreflangCodes } from "@/config/site";
import { siteDescription, siteName } from "@/config/site-content";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const FALLBACK_SITE_URL = new URL("http://localhost:4321");

/**
 * Serves the RSS feed with every product of the exported catalog.
 * @param context Astro endpoint context; its `site` URL is used as the feed origin.
 * @returns RSS response with one item per product.
 */
export const GET: APIRoute = async (context) => {
  const products = await getCollection("products");
  return rss({
    title: siteName,
    description: siteDescription ?? "",
    site: context.site ?? FALLBACK_SITE_URL,
    items: products.map((product) => ({
      title: product.data.name,
      description:
        product.data.longDescription ?? product.data.shortDescription,
      link: `/${defaultLocale}/products/${product.id}`,
    })),
    customData: `<language>${hreflangCodes[defaultLocale]}</language>`,
  });
};
