import { siteDescription, siteName } from "@/config/site-content";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/**
 * Serves the RSS feed with every product of the exported catalog.
 * @param context Astro endpoint context; its `site` URL is used as the feed origin.
 * @returns RSS response with one item per product.
 */
export const GET: APIRoute = async (context) => {
  const products = await getCollection("products");
  return rss({
    // `<title>` field in output xml
    title: siteName,
    // `<description>` field in output xml
    description: siteDescription,
    // Pull in your project "site" from the endpoint context
    // https://docs.astro.build/en/reference/api-reference/#site
    site: context?.site ?? siteName,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: products.map((product) => ({
      title: product.data.name,
      description:
        product.data.longDescription ?? product.data.shortDescription,
      link: product.filePath,
    })),
    // (optional) inject custom xml
    customData: `<language>en-us</language>`,
  });
};
