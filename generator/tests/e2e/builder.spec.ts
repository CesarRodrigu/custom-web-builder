import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";

import { waitForEditorHydration } from "@tests/e2e/helpers";

test.describe("configuration editor in Spanish", () => {
  test("validates in real time and exports the configuration package", async ({
    page,
  }) => {
    await page.goto("/es/");

    await expect(
      page.getByRole("heading", { name: "Configuración del sitio" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cambiar idioma" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
    await waitForEditorHydration(page);

    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const downloadButton = page
      .getByRole("button", { name: "Descargar configuración" })
      .first();
    await expect(downloadButton).toBeDisabled();
    await expect(
      page.getByText(/Completa los campos obligatorios/),
    ).toBeVisible();

    await page.getByRole("button", { name: "site" }).click();
    await expect(
      page.getByRole("heading", { name: "Configuración del sitio" }),
    ).toBeVisible();

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByLabel("Correo electrónico de contacto").fill("corerroneo");
    await expect(
      page.getByText("Introduce un correo electrónico válido."),
    ).toBeVisible();
    await page
      .getByLabel("Correo electrónico de contacto")
      .fill("hola@panaderia.com");

    await expect(page.getByText("Todavía no hay productos")).toBeVisible();

    await page.getByRole("button", { name: "Añadir producto" }).click();
    await expect(page.getByRole("button", { name: "product-1" })).toBeVisible();
    await expect(
      page.getByText("Este campo es obligatorio.").first(),
    ).toBeVisible();
    await expect(page.getByText("Introduce un precio válido")).toBeVisible();

    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await expect(
      page.getByRole("button", { name: "tarta-de-manzana" }),
    ).toBeVisible();
    await page.getByLabel("Precio").fill("19,99");
    await page.getByLabel("Descripción corta").fill("Texto breve");
    await expect(page.getByText("Este campo es obligatorio.")).toHaveCount(0);

    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Descargar configuración" }),
    ).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar configuración" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("panaderia-maria.zip");
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );
    const siteDocument = await packageZip.file("site.json")?.async("string");
    const productDocument = await packageZip
      .file("products/tarta-de-manzana.json")
      ?.async("string");
    expect(JSON.parse(siteDocument ?? "")).toEqual({
      $schema: "schemas/site.schema.json",
      name: "Panadería María",
      description: "",
      contactEmail: "hola@panaderia.com",
    });
    expect(JSON.parse(productDocument ?? "")).toEqual({
      $schema: "../schemas/product.schema.json",
      sku: "PANADERIA-TARTA-DE-MANZANA-001",
      name: "Tarta de manzana",
      price: 19.99,
      categories: [],
      shortDescription: "Texto breve",
      mainImage: "",
      images: [],
    });
  });

  test("adds a new empty product only after the current one is complete", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();

    await page.getByRole("button", { name: "Añadir y continuar" }).click();
    await expect(
      page.getByText(
        "Completa los campos marcados antes de añadir otro producto.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "product-1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "product-2" })).toHaveCount(
      0,
    );

    await page.getByLabel("Nombre del producto").fill("Tarta");
    await page.getByLabel("Precio").fill("5");
    await page.getByLabel("Descripción corta").fill("Texto breve");
    await expect(
      page.getByText(
        "Completa los campos marcados antes de añadir otro producto.",
      ),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Añadir y continuar" }).click();
    await expect(page.getByRole("button", { name: "product-2" })).toBeVisible();
    await expect(page.getByLabel("Nombre del producto")).toHaveValue("");
    await expect(page.getByLabel("Precio")).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "tarta", exact: true }),
    ).toBeVisible();
  });

  test("exports the package with the site file, one file per product and one per category", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await page.getByLabel("Precio").fill("19,99");
    await page.getByLabel("Descripción corta").fill("Texto breve");

    const categoryInput = page.getByLabel("Categoría");
    await categoryInput.click();
    await categoryInput.fill("Tartas");
    await categoryInput.press("Enter");
    await expect(
      page.locator('[data-slot="combobox-chip"]').filter({
        hasText: "Tartas",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "tarta-de-manzana" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    await page.getByLabel("Formato").click();
    await page
      .getByRole("option", { name: "Carpeta de configuración (YAML)" })
      .click();
    const downloadButton = page
      .getByRole("button", { name: "Descargar configuración" })
      .first();
    await expect(downloadButton).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("panaderia-maria.zip");
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );
    const siteDocument = await packageZip.file("site.yaml")?.async("string");
    const productDocument = await packageZip
      .file("products/tarta-de-manzana.yaml")
      ?.async("string");
    const categoryDocument = await packageZip
      .file("categories/tartas.yaml")
      ?.async("string");
    expect(siteDocument).toContain("name: Panadería María");
    expect(categoryDocument).toContain("id: tartas");
    expect(categoryDocument).toContain("products:");
    expect(categoryDocument).toContain("tarta-de-manzana");
    expect(productDocument).toContain("name: Tarta de manzana");
    expect(productDocument).toContain("price: 19.99");
    expect(productDocument).toContain("categories:");
    expect(productDocument).toContain("shortDescription: Texto breve");
  });

  test("edits a category, removes a product from it and exports the result", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await page.getByLabel("Precio").fill("19,99");
    await page.getByLabel("Descripción corta").fill("Texto breve");
    const categoryInput = page.getByLabel("Categoría");
    await categoryInput.click();
    await categoryInput.fill("Tartas");
    await categoryInput.press("Enter");

    await expect(
      page.getByRole("button", { name: "tartas", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "tartas", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Tartas" })).toBeVisible();
    await expect(page.getByText("Tarta de manzana")).toBeVisible();

    await page.getByLabel("Nombre de la categoría").fill("Postres");
    await page
      .getByLabel("Descripción de la categoría")
      .fill("Tartas para compartir");
    await expect(page.getByRole("heading", { name: "Postres" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "postres", exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: "Quitar de la categoría: Tarta de manzana",
      })
      .click();
    await expect(
      page.getByText("Esta categoría todavía no tiene productos."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar configuración" }).click();
    const download = await downloadPromise;
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );
    const categoryDocument = await packageZip
      .file("categories/postres.json")
      ?.async("string");
    const productDocument = await packageZip
      .file("products/tarta-de-manzana.json")
      ?.async("string");
    expect(JSON.parse(categoryDocument ?? "")).toEqual({
      $schema: "../schemas/category.schema.json",
      id: "postres",
      name: "Postres",
      description: "Tartas para compartir",
      products: [],
    });
    expect(JSON.parse(productDocument ?? "").categories).toEqual([]);
  });

  test("adds a category from the sidebar and keeps it with no products", async ({
    page,
  }) => {
    await page.goto("/en/");
    await waitForEditorHydration(page);

    await page.getByLabel("Site name").fill("Bakery");
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(
      page.getByRole("heading", { name: "Category 1" }),
    ).toBeVisible();

    await page.getByLabel("Category name").fill("Drinks");
    await page
      .getByLabel("Category description")
      .fill("Coffee and soft drinks");
    await expect(
      page.getByRole("button", { name: "drinks", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download configuration" }).click();
    const download = await downloadPromise;
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );
    expect(
      JSON.parse(
        (await packageZip.file("categories/drinks.json")?.async("string")) ??
          "",
      ),
    ).toEqual({
      $schema: "../schemas/category.schema.json",
      id: "drinks",
      name: "Drinks",
      description: "Coffee and soft drinks",
      products: [],
    });
  });

  test("marks a category file only when that category has a field error", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir categoría" }).click();
    await page.getByLabel("Nombre de la categoría").fill("Bebidas");
    const categoryFile = page.getByRole("button", {
      name: "bebidas",
      exact: true,
    });
    await expect(categoryFile).toBeVisible();

    await page.getByRole("button", { name: "site", exact: true }).click();
    await page.getByLabel("Nombre del sitio").fill("");
    await expect(
      page.getByRole("button", { name: "site", exact: true }),
    ).toHaveClass(/text-destructive/);
    await expect(categoryFile).not.toHaveClass(/text-destructive/);

    await categoryFile.click();
    await page.getByLabel("Nombre de la categoría").fill("");
    await expect(
      page.getByRole("button", { name: "category-1", exact: true }),
    ).toHaveClass(/text-destructive/);
  });

  test("exports the optional product fields entered in the editor", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await page.getByLabel("Precio").fill("19,99");
    await page.getByLabel("Descripción corta").fill("Texto breve");
    await page.getByLabel("Descripción larga").fill("Texto largo");
    await page.getByLabel("Stock").fill("12");
    await page.getByRole("combobox", { name: "Estado" }).click();
    await page.getByRole("option", { name: "Recomendado" }).click();
    await expect(page.getByRole("combobox", { name: "Estado" })).toContainText(
      "Recomendado",
    );
    await page.getByRole("combobox", { name: "Estado" }).click();
    await page.getByRole("option", { name: "Sin estado especial" }).click();
    await expect(page.getByRole("combobox", { name: "Estado" })).toContainText(
      "Sin estado especial",
    );
    await page.getByRole("combobox", { name: "Estado" }).click();
    await page.getByRole("option", { name: "Recomendado" }).click();
    await page
      .getByLabel("Galería de imágenes")
      .fill("/images/tarta-1.jpg\n/images/tarta-2.jpg");
    await page.getByLabel("Imagen principal").fill("/images/tarta-1.jpg");

    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar configuración" }).click();
    const download = await downloadPromise;

    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );
    const productDocument = await packageZip
      .file("products/tarta-de-manzana.json")
      ?.async("string");
    expect(JSON.parse(productDocument ?? "")).toEqual({
      $schema: "../schemas/product.schema.json",
      sku: "PANADERIA-TARTA-DE-MANZANA-001",
      name: "Tarta de manzana",
      price: 19.99,
      categories: [],
      shortDescription: "Texto breve",
      longDescription: "Texto largo",
      stock: 12,
      status: "recommended",
      mainImage: "/images/tarta-1.jpg",
      images: ["/images/tarta-1.jpg", "/images/tarta-2.jpg"],
    });
  });

  test("keeps the draft across a page reload", async ({ page }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page
      .getByLabel("Correo electrónico de contacto")
      .fill("hola@panaderia.com");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await page.getByLabel("Precio").fill("19,99");

    await page.reload();
    await waitForEditorHydration(page);

    await expect(page.getByLabel("Nombre del sitio")).toHaveValue(
      "Panadería María",
    );
    await expect(page.getByLabel("Correo electrónico de contacto")).toHaveValue(
      "hola@panaderia.com",
    );
    await expect(
      page.getByRole("button", { name: "tarta-de-manzana" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "tarta-de-manzana" }).click();
    await expect(page.getByLabel("Nombre del producto")).toHaveValue(
      "Tarta de manzana",
    );
    await expect(page.getByLabel("Precio")).toHaveValue("19,99");
  });

  test("removes a product only after the user confirms it", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta");
    await page.getByLabel("Precio").fill("5");
    await expect(page.getByRole("button", { name: "tarta" })).toBeVisible();

    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByText("¿Eliminar este producto?")).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("button", { name: "tarta" })).toBeVisible();

    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await page.getByRole("button", { name: "Eliminar producto" }).click();

    await expect(page.getByText("¿Eliminar este producto?")).toBeHidden();
    await expect(page.getByRole("button", { name: "tarta" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Configuración del sitio" }),
    ).toBeVisible();
  });

  test("keeps the ids of the remaining products when one is deleted", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    // Three unnamed products take the fallback file names product-1,
    // product-2 and product-3, each keyed by its own incremental id.
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Precio").fill("5");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Precio").fill("6");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Precio").fill("7");

    const firstRow = page.getByRole("button", { name: "product-1" });
    const secondRow = page.getByRole("button", { name: "product-2" });
    const thirdRow = page.getByRole("button", { name: "product-3" });
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();
    await expect(thirdRow).toBeVisible();

    await firstRow.hover();
    const trash = page.getByRole("button", { name: "Borrar producto" }).first();
    await trash.click();
    await expect(page.getByText("¿Eliminar este producto?")).toBeVisible();
    await page.getByRole("button", { name: "Eliminar producto" }).click();

    // The dialog closes and neither remaining row inherits the deleted
    // product-1: their file names keep the ids they were created with.
    await expect(page.getByText("¿Eliminar este producto?")).toBeHidden();
    await expect(firstRow).toHaveCount(0);
    await expect(secondRow).toBeVisible();
    await expect(thirdRow).toBeVisible();

    // The heading of a remaining product shows its own id, not its position.
    await secondRow.click();
    await expect(
      page.getByRole("heading", { name: "Producto 2" }),
    ).toBeVisible();
    await thirdRow.click();
    await expect(
      page.getByRole("heading", { name: "Producto 3" }),
    ).toBeVisible();
  });

  test("deletes a product from the trash revealed on its sidebar row", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta");
    await page.getByLabel("Precio").fill("5");
    const productRow = page.getByRole("button", { name: "tarta" });
    await expect(productRow).toBeVisible();

    const trash = page.getByRole("button", { name: "Borrar producto" });
    await expect(trash).toHaveCSS("opacity", "0");
    await productRow.hover();
    await expect(trash).toHaveCSS("opacity", "1");

    await trash.click();
    await expect(page.getByText("¿Eliminar este producto?")).toBeVisible();
    await page.getByRole("button", { name: "Eliminar producto" }).click();

    await expect(page.getByText("¿Eliminar este producto?")).toBeHidden();
    await expect(productRow).toHaveCount(0);
    await expect(trash).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Configuración del sitio" }),
    ).toBeVisible();
  });

  test("generates unique SKUs from the entered data and validates manual ones", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await expect(page.getByLabel("Código (SKU)")).toHaveValue(
      "PANADERIA-ITEM-001",
    );

    await page.getByLabel("Nombre del producto").fill("Tarta");
    await expect(page.getByLabel("Código (SKU)")).toHaveValue(
      "PANADERIA-TARTA-001",
    );

    await page.getByLabel("Precio").fill("5");
    await page.getByLabel("Descripción corta").fill("Texto breve");
    await page.getByRole("button", { name: "Añadir y continuar" }).click();

    await page.getByLabel("Nombre del producto").fill("Pan");
    await expect(page.getByLabel("Código (SKU)")).toHaveValue(
      "PANADERIA-PAN-001",
    );

    // A manual code takes precedence: the automatic code of the first
    // product moves to the next free sequence instead of colliding with it.
    await page.getByLabel("Código (SKU)").fill("panaderia-tarta-001");
    await expect(page.getByLabel("Código (SKU)")).toHaveValue(
      "PANADERIA-TARTA-001",
    );
    await page.getByRole("button", { name: "tarta", exact: true }).click();
    await expect(page.getByLabel("Código (SKU)")).toHaveValue(
      "PANADERIA-TARTA-002",
    );

    // Two manual codes that match are reported and block the export.
    await page.getByLabel("Código (SKU)").fill("panaderia-tarta-001");
    await expect(
      page.getByText("Otro producto del catálogo ya usa este código."),
    ).toBeVisible();

    // The inline action restores generation and frees the taken code.
    await page.getByRole("button", { name: "Generar código" }).click();
    await expect(page.getByLabel("Código (SKU)")).toHaveValue(
      "PANADERIA-TARTA-002",
    );
    await expect(
      page.getByText("Otro producto del catálogo ya usa este código."),
    ).toHaveCount(0);
  });

  test("reports duplicate product names and blocks the export", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Pan");
    await page.getByLabel("Precio").fill("2");

    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("  pan  ");
    await page.getByLabel("Precio").fill("3");

    await expect(
      page.getByText("Otro producto del catálogo ya usa este nombre."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Descargar configuración" }).first(),
    ).toBeDisabled();
  });
});

test.describe("configuration editor in English", () => {
  test("validates in real time and exports the configuration package", async ({
    page,
  }) => {
    await page.goto("/en/");

    await expect(
      page.getByRole("heading", { name: "Site configuration" }),
    ).toBeVisible();
    await waitForEditorHydration(page);

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadButton = page
      .getByRole("button", { name: "Download configuration" })
      .first();
    await expect(downloadButton).toBeDisabled();
    await expect(page.getByText(/Fill in the required fields/)).toBeVisible();

    await page.getByRole("button", { name: "site" }).click();
    await page.getByLabel("Site name").fill("Maria's Bakery");
    await page.getByRole("button", { name: "Add product" }).click();
    await expect(page.getByRole("button", { name: "product-1" })).toBeVisible();
    await expect(
      page.getByText("This field is required.").first(),
    ).toBeVisible();
    await expect(page.getByText("Enter a valid price")).toBeVisible();

    await page.getByLabel("Product name").fill("Apple pie");
    await expect(page.getByRole("button", { name: "apple-pie" })).toBeVisible();
    await page.getByLabel("Price").fill("12.50");
    await page.getByLabel("Short description").fill("Brief text");

    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Download configuration" }),
    ).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download configuration" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("maria-s-bakery.zip");
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );
    const siteDocument = await packageZip.file("site.json")?.async("string");
    const productDocument = await packageZip
      .file("products/apple-pie.json")
      ?.async("string");
    expect(JSON.parse(siteDocument ?? "")).toEqual({
      $schema: "schemas/site.schema.json",
      name: "Maria's Bakery",
      description: "",
      contactEmail: "",
    });
    expect(JSON.parse(productDocument ?? "")).toEqual({
      $schema: "../schemas/product.schema.json",
      sku: "MARIA-APPLE-PIE-001",
      name: "Apple pie",
      price: 12.5,
      categories: [],
      shortDescription: "Brief text",
      mainImage: "",
      images: [],
    });
  });

  test("adds a new empty product only after the current one is complete", async ({
    page,
  }) => {
    await page.goto("/en/");
    await waitForEditorHydration(page);

    await page.getByRole("button", { name: "Add product" }).click();
    await page.getByRole("button", { name: "Add and continue" }).click();
    await expect(
      page.getByText(
        "Fill in the marked fields before adding another product.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "product-1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "product-2" })).toHaveCount(
      0,
    );

    await page.getByLabel("Product name").fill("Apple pie");
    await page.getByLabel("Price").fill("12.50");
    await page.getByLabel("Short description").fill("Brief text");
    await page.getByRole("button", { name: "Add and continue" }).click();
    await expect(page.getByRole("button", { name: "product-2" })).toBeVisible();
    await expect(page.getByLabel("Product name")).toHaveValue("");
    await expect(page.getByLabel("Price")).toHaveValue("");
  });

  test("shows a disabled delete action on the products root folder", async ({
    page,
  }) => {
    await page.goto("/en/");
    await waitForEditorHydration(page);

    const productsRow = page
      .getByRole("button", { name: "products", exact: true })
      .locator("..");
    await expect(
      productsRow.getByRole("button", { name: "Delete folder" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Add folder" }).click();
    const folderInput = page.getByRole("textbox", { name: "Add folder" });
    await folderInput.fill("Sweets");
    await folderInput.press("Enter");

    const sweetsRow = page
      .getByRole("button", { name: "sweets", exact: true })
      .locator("..");
    await expect(
      sweetsRow.getByRole("button", { name: "Delete folder" }),
    ).toBeEnabled();
  });

  test("creates a nested folder and moves a product into it by dragging", async ({
    page,
  }) => {
    await page.goto("/en/");
    await waitForEditorHydration(page);

    await page.getByLabel("Site name").fill("Bakery");
    await page.getByRole("button", { name: "Add product" }).click();
    await page.getByLabel("Product name").fill("Apple pie");
    await page.getByLabel("Price").fill("12.50");
    await page.getByLabel("Short description").fill("Brief text");
    await expect(page.getByRole("button", { name: "apple-pie" })).toBeVisible();

    await page.getByRole("button", { name: "Add folder" }).click();
    const folderInput = page.getByRole("textbox", { name: "Add folder" });
    await folderInput.fill("Sweets/Cakes");
    await folderInput.press("Enter");

    await expect(
      page.getByRole("button", { name: "sweets", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "cakes", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "apple-pie" })
      .dragTo(page.getByRole("button", { name: "cakes", exact: true }));

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download configuration" }).click();
    const download = await downloadPromise;
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );

    expect(
      await packageZip
        .file("products/sweets/cakes/apple-pie.json")
        ?.async("string"),
    ).toContain("Apple pie");
    expect(
      JSON.parse(
        (await packageZip.file("folders.json")?.async("string")) ?? "{}",
      ),
    ).toEqual({ folders: ["sweets", "sweets/cakes"] });
  });

  test("adds a product to the folder whose add button was used", async ({
    page,
  }) => {
    await page.goto("/en/");
    await waitForEditorHydration(page);

    await page.getByLabel("Site name").fill("Bakery");
    await page.getByRole("button", { name: "Add folder" }).click();
    const folderInput = page.getByRole("textbox", { name: "Add folder" });
    await folderInput.fill("Sweets");
    await folderInput.press("Enter");
    await expect(
      page.getByRole("button", { name: "sweets", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add subfolder" }).click();
    const subfolderInput = page.getByRole("textbox", {
      name: "Add subfolder",
    });
    await subfolderInput.fill("Cakes");
    await subfolderInput.press("Enter");
    await expect(
      page.getByRole("button", { name: "cakes", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: 'Add product to "cakes"' }).click();
    await page.getByLabel("Product name").fill("Apple pie");
    await page.getByLabel("Price").fill("12.50");
    await page.getByLabel("Short description").fill("Brief text");

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download configuration" }).click();
    const download = await downloadPromise;
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );

    expect(
      packageZip.file("products/sweets/cakes/apple-pie.json"),
    ).not.toBeNull();
    expect(packageZip.file("products/apple-pie.json")).toBeNull();
  });

  test("returns a product to the products root when its folder is deleted", async ({
    page,
  }) => {
    await page.goto("/en/");
    await waitForEditorHydration(page);

    await page.getByLabel("Site name").fill("Bakery");
    await page.getByRole("button", { name: "Add product" }).click();
    await page.getByLabel("Product name").fill("Apple pie");
    await page.getByLabel("Price").fill("12.50");
    await page.getByLabel("Short description").fill("Brief text");

    await page.getByRole("button", { name: "Add folder" }).click();
    const folderInput = page.getByRole("textbox", { name: "Add folder" });
    await folderInput.fill("Sweets");
    await folderInput.press("Enter");
    await expect(
      page.getByRole("button", { name: "sweets", exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "apple-pie" })
      .dragTo(page.getByRole("button", { name: "sweets", exact: true }));

    await page
      .getByRole("button", { name: "sweets", exact: true })
      .locator("..")
      .getByRole("button", { name: "Delete folder" })
      .click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete folder" }).click();

    await expect(
      page.getByRole("button", { name: "sweets", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "apple-pie" })).toBeVisible();

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download configuration" }).click();
    const download = await downloadPromise;
    const packageZip = await JSZip.loadAsync(
      readFileSync(await download.path()),
    );

    expect(packageZip.file("products/apple-pie.json")).not.toBeNull();
    expect(packageZip.file("folders.json")).toBeNull();
  });
});
