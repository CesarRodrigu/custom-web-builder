import { describe, expect, it } from "vitest";

import { buildFileTree } from "@/lib/catalog/tree";
import { draftWith, productWith } from "@tests/unit/helpers/fixtures";

describe("buildFileTree", () => {
  it("shows the site file and one product file under its visual folder", () => {
    const tree = buildFileTree(draftWith({ products: [productWith()] }));

    expect(tree).toEqual([
      { type: "file", name: "site", path: "site.json" },
      {
        type: "folder",
        name: "products",
        path: "products",
        children: [
          {
            type: "folder",
            name: "p",
            path: "products/p",
            children: [
              {
                type: "file",
                name: "product-1",
                path: "products/p/product-1.json",
                productIndex: 0,
                productId: 1,
              },
            ],
          },
        ],
      },
    ]);
  });

  it("names an unnamed product after its id so deletions never shift file names", () => {
    // The product sits at position 0 but keeps id 3: the two products
    // created before it were deleted, so its file must stay product-3.
    const tree = buildFileTree(
      draftWith({ products: [productWith({ id: 3 })] }),
    );

    const productsFolder = tree[1];
    expect(
      productsFolder?.type === "folder" ? productsFolder.children : [],
    ).toEqual([
      {
        type: "folder",
        name: "p",
        path: "products/p",
        children: [
          {
            type: "file",
            name: "product-3",
            path: "products/p/product-3.json",
            productIndex: 0,
            productId: 3,
          },
        ],
      },
    ]);
  });

  it("does not use categories as folders", () => {
    const tree = buildFileTree(
      draftWith({
        products: [
          productWith({
            name: "Tarta de manzana",
            categories: ["Dulces", "Tartas"],
          }),
        ],
      }),
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
            name: "t",
            path: "products/t",
            children: [
              {
                type: "file",
                name: "tarta-de-manzana",
                path: "products/t/tarta-de-manzana.json",
                productIndex: 0,
                productId: 1,
              },
            ],
          },
        ],
      },
    ]);
  });

  it("shows a product with several categories once", () => {
    const tree = buildFileTree(
      draftWith({
        products: [
          productWith({
            name: "Coffee cake",
            categories: ["Sweets", "Cakes"],
          }),
        ],
      }),
    );

    const productsFolder = tree[1];
    expect(
      productsFolder?.type === "folder" ? productsFolder.children : [],
    ).toEqual([
      {
        type: "folder",
        name: "c",
        path: "products/c",
        children: [
          {
            type: "file",
            name: "coffee-cake",
            path: "products/c/coffee-cake.json",
            productIndex: 0,
            productId: 1,
          },
        ],
      },
    ]);
  });
});
