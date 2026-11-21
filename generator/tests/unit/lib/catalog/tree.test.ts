import { describe, expect, it } from "vitest";

import { buildFileTree } from "@/lib/catalog/tree";
import {
  categoryWith,
  draftWith,
  productWith,
} from "@tests/unit/helpers/fixtures";

describe("buildFileTree", () => {
  it("shows the site file and one product file directly in the products folder", () => {
    const tree = buildFileTree(draftWith({ products: [productWith()] }));

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
      {
        type: "folder",
        name: "categories",
        path: "categories",
        children: [],
      },
    ]);
  });

  it("names an unnamed product after its id so deletions never shift file names", () => {
    const tree = buildFileTree(
      draftWith({ products: [productWith({ id: 3 })] }),
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
            type: "file",
            name: "tarta-de-manzana",
            path: "products/tarta-de-manzana.json",
            productIndex: 0,
            productId: 1,
          },
        ],
      },
      {
        type: "folder",
        name: "categories",
        path: "categories",
        children: [
          {
            type: "file",
            name: "dulces",
            path: "categories/dulces.json",
          },
          {
            type: "file",
            name: "tartas",
            path: "categories/tartas.json",
          },
        ],
      },
    ]);
  });

  it("shows the generated category files with their unique ids", () => {
    const tree = buildFileTree(
      draftWith({
        products: [
          productWith({ name: "Bread", categories: ["Café", "Cafe"] }),
        ],
      }),
    );

    const categoriesFolder = tree[2];
    expect(
      categoriesFolder?.type === "folder" ? categoriesFolder.children : [],
    ).toEqual([
      { type: "file", name: "cafe", path: "categories/cafe.json" },
      { type: "file", name: "cafe-2", path: "categories/cafe-2.json" },
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
        type: "file",
        name: "coffee-cake",
        path: "products/coffee-cake.json",
        productIndex: 0,
        productId: 1,
      },
    ]);
  });

  it("shows the user folders, nested and empty ones, and the products inside them", () => {
    const tree = buildFileTree(
      draftWith({
        folders: ["dulces", "dulces/tartas", "salados"],
        products: [
          productWith({ name: "Tarta", price: 2, folder: "dulces/tartas" }),
          productWith({ id: 2, name: "Pan", price: 1, folder: "salados" }),
          productWith({ id: 3, name: "Cafe", price: 1 }),
        ],
      }),
    );

    const productsFolder = tree[1];
    expect(
      productsFolder?.type === "folder" ? productsFolder.children : [],
    ).toEqual([
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
                name: "tarta",
                path: "products/dulces/tartas/tarta.json",
                productIndex: 0,
                productId: 1,
              },
            ],
          },
        ],
      },
      {
        type: "folder",
        name: "salados",
        path: "products/salados",
        children: [
          {
            type: "file",
            name: "pan",
            path: "products/salados/pan.json",
            productIndex: 1,
            productId: 2,
          },
        ],
      },
      {
        type: "file",
        name: "cafe",
        path: "products/cafe.json",
        productIndex: 2,
        productId: 3,
      },
    ]);
  });

  it("shows a product whose folder is not declared in the folder list", () => {
    const tree = buildFileTree(
      draftWith({
        folders: [],
        products: [
          productWith({ name: "Tarta", price: 2, folder: "dulces/tartas" }),
        ],
      }),
    );

    const productsFolder = tree[1];
    expect(
      productsFolder?.type === "folder" ? productsFolder.children : [],
    ).toEqual([
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
                name: "tarta",
                path: "products/dulces/tartas/tarta.json",
                productIndex: 0,
                productId: 1,
              },
            ],
          },
        ],
      },
    ]);
  });

  it("keeps a preview file for a category whose name is still blank", () => {
    const tree = buildFileTree(
      draftWith({
        categories: [
          categoryWith({ id: 2, name: "" }),
          categoryWith({ id: 3, name: "Panes" }),
        ],
      }),
    );

    const categoriesFolder = tree[2];
    expect(
      categoriesFolder?.type === "folder" ? categoriesFolder.children : [],
    ).toEqual([
      {
        type: "file",
        name: "panes",
        path: "categories/panes.json",
        categoryIndex: 1,
      },
      {
        type: "file",
        name: "category-1",
        path: "categories/category-1.json",
        categoryIndex: 0,
      },
    ]);
  });

  it("links every generated category file to its category page", () => {
    const tree = buildFileTree(
      draftWith({
        categories: [
          categoryWith({ id: 1, name: "Panes" }),
          categoryWith({ id: 2, name: "Dulces" }),
        ],
        products: [productWith({ categories: ["Panes"] })],
      }),
    );

    const categoriesFolder = tree[2];
    expect(
      categoriesFolder?.type === "folder" ? categoriesFolder.children : [],
    ).toEqual([
      {
        type: "file",
        name: "panes",
        path: "categories/panes.json",
        categoryIndex: 0,
      },
      {
        type: "file",
        name: "dulces",
        path: "categories/dulces.json",
        categoryIndex: 1,
      },
    ]);
  });
});
