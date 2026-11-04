import { describe, expect, it } from "vitest";

import { buildFileTree } from "@/lib/catalog/tree";
import type { SiteConfigDraft } from "@/lib/catalog/schema";

/**
 * Builds a draft out of its product list, so tests only specify the catalog
 * shape under check.
 * @param products Products of the draft.
 * @returns A full draft ready to be turned into a file tree.
 */
function draftWith(products: SiteConfigDraft["products"]): SiteConfigDraft {
  return {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
    },
    products,
  };
}

describe("buildFileTree", () => {
  it("shows the site file and flat product files when no category is set", () => {
    const tree = buildFileTree(
      draftWith([
        {
          id: 1,
          name: "",
          categories: [],
          description: "",
          price: "",
          imageUrl: "",
        },
      ]),
    );

    expect(tree).toEqual([
      { type: "file", name: "site", path: "site.json" },
      {
        type: "folder",
        name: "products",
        path: "products",
        children: [
          {
            type: "file",
            name: "product-1",
            path: "products/product-1.json",
            productIndex: 0,
            productId: 1,
          },
        ],
      },
    ]);
  });

  it("names an unnamed product after its id so deletions never shift file names", () => {
    // The product sits at position 0 but keeps id 3: the two products
    // created before it were deleted, so its file must stay product-3.
    const tree = buildFileTree(
      draftWith([
        {
          id: 3,
          name: "",
          categories: [],
          description: "",
          price: "",
          imageUrl: "",
        },
      ]),
    );

    const productsFolder = tree[1];
    expect(
      productsFolder?.type === "folder" ? productsFolder.children : [],
    ).toEqual([
      {
        type: "file",
        name: "product-3",
        path: "products/product-3.json",
        productIndex: 0,
        productId: 3,
      },
    ]);
  });

  it("nests the category chain of every product inside the products folder", () => {
    const tree = buildFileTree(
      draftWith([
        {
          id: 1,
          name: "Tarta de manzana",
          categories: ["Dulces/Tartas"],
          description: "",
          price: "",
          imageUrl: "",
        },
      ]),
    );

    expect(tree).toEqual([
      { type: "file", name: "site", path: "site.json" },
      {
        type: "folder",
        name: "products",
        path: "products",
        children: [
          {
            type: "folder",
            name: "dulces",
            path: "products/dulces",
            children: [
              {
                type: "folder",
                name: "tartas",
                path: "products/dulces/tartas",
                children: [
                  {
                    type: "file",
                    name: "tarta-de-manzana",
                    path: "products/dulces/tartas/tarta-de-manzana.json",
                    productIndex: 0,
                    productId: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("shows a product once per category and keeps folders shared", () => {
    const tree = buildFileTree(
      draftWith([
        {
          id: 1,
          name: "Coffee cake",
          categories: ["Sweets/Cakes", "Sweets"],
          description: "",
          price: "",
          imageUrl: "",
        },
      ]),
    );

    const productsFolder = tree[1];
    expect(productsFolder).toEqual({
      type: "folder",
      name: "products",
      path: "products",
      children: expect.arrayContaining([
        {
          type: "folder",
          name: "sweets",
          path: "products/sweets",
          children: expect.arrayContaining([
            {
              type: "file",
              name: "coffee-cake",
              path: "products/sweets/coffee-cake.json",
              productIndex: 0,
              productId: 1,
            },
          ]),
        },
      ]),
    });
    const sweets =
      productsFolder?.type === "folder"
        ? productsFolder.children[0]
        : undefined;
    expect(
      sweets?.type === "folder"
        ? sweets.children.map((child) => JSON.stringify(child))
        : [],
    ).toEqual([
      JSON.stringify({
        type: "folder",
        name: "cakes",
        path: "products/sweets/cakes",
        children: [
          {
            type: "file",
            name: "coffee-cake",
            path: "products/sweets/cakes/coffee-cake.json",
            productIndex: 0,
            productId: 1,
          },
        ],
      }),
      JSON.stringify({
        type: "file",
        name: "coffee-cake",
        path: "products/sweets/coffee-cake.json",
        productIndex: 0,
        productId: 1,
      }),
    ]);
    expect(
      productsFolder?.type === "folder" ? productsFolder.children : [],
    ).toHaveLength(1);
  });
});
