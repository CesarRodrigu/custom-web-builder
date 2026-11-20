import type { APIRoute, GetStaticPathsResult } from "astro";
import { getCollection, getEntry } from "astro:content";
import { locales } from "@/config/site";

/**
 * Builds the Markdown mirror path of every product for every locale.
 * @returns One path per locale and product, with the product entry as prop.
 */
export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  const products = await getCollection("products");

  return locales.flatMap((locale) =>
    products.map((product) => ({
      params: {
        locale,
        slug: product.id,
      },
      props: {
        post: product,
      },
    })),
  );
}

type MarkdownOptions = {
  headingLevel?: number;
};

/**
 * Serializes a product document as nested Markdown sections and key-value lines.
 * @param data Product document to serialize; nested objects and arrays become subsections.
 * @param options Heading level of the top-level sections, `2` by default.
 * @returns Markdown body with one section per object property.
 */
function objectToMarkdown(
  data: Record<string, unknown>,
  options: MarkdownOptions = {},
): string {
  const { headingLevel = 2 } = options;

  return Object.entries(data)
    .map(([key, value]) => {
      const title = key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .replace(/^./, (char) => char.toUpperCase());

      if (value === null || value === undefined) {
        return "";
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return "";

        const items = value.map((item) => {
          if (typeof item === "object" && item !== null) {
            return objectToMarkdown(item as Record<string, unknown>, {
              headingLevel: headingLevel + 1,
            });
          }

          return `- ${String(item)}`;
        });

        return `\n${"#".repeat(headingLevel)} ${title}\n\n${items.join("\n")}`;
      }

      if (typeof value === "object") {
        return `\n${"#".repeat(headingLevel)} ${title}\n\n${objectToMarkdown(
          value as Record<string, unknown>,
          { headingLevel: headingLevel + 1 },
        )}`;
      }

      return `**${title}:** ${String(value)}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Serves one product as a Markdown document with a frontmatter-like header.
 * @param context Astro endpoint context; its `props.post` is the product of the path.
 * @returns Markdown response of the requested product.
 */
export const GET: APIRoute = async (context) => {
  const { post } = context.props;
  const entry = await getEntry("products", post.id);

  return new Response(
    `---\n${objectToMarkdown(entry.data, { headingLevel: 2 })}\n---`,
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    },
  );
};
