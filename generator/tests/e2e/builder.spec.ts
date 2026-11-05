import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";

/**
 * Waits until the configuration editor island has hydrated, so every
 * interaction goes through React instead of racing the static Server markup.
 *
 * Astro marks islands with an `ssr` attribute until hydration completes, so
 * the wait ends exactly when the editor becomes interactive.
 * @param page Playwright page showing the editor.
 */
async function waitForEditorHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelectorAll("astro-island:not([ssr])").length > 0,
  );
}

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
    await expect(page.getByText("Este campo es obligatorio.")).toBeVisible();
    await expect(page.getByText("Introduce un precio válido")).toBeVisible();

    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await expect(
      page.getByRole("button", { name: "tarta-de-manzana" }),
    ).toBeVisible();
    await page.getByLabel("Precio").fill("19,99");
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
      name: "Panadería María",
      contactEmail: "hola@panaderia.com",
    });
    expect(JSON.parse(productDocument ?? "")).toEqual({
      name: "Tarta de manzana",
      price: 19.99,
    });
  });

  test("exports the package with the site file and the per product folders", async ({
    page,
  }) => {
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await page.getByLabel("Nombre del sitio").fill("Panadería María");
    await page.getByRole("button", { name: "Añadir producto" }).click();
    await page.getByLabel("Nombre del producto").fill("Tarta de manzana");
    await page.getByLabel("Precio").fill("19,99");

    const categoryInput = page.getByLabel("Categoría");
    await categoryInput.click();
    await categoryInput.fill("Dulces/Tartas");
    await categoryInput.press("Enter");
    await expect(
      page.locator('[data-slot="combobox-chip"]').filter({
        hasText: "Dulces/Tartas",
      }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "dulces" })).toBeVisible();
    await expect(page.getByRole("button", { name: "tartas" })).toBeVisible();
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
      .file("products/dulces/tartas/tarta-de-manzana.yaml")
      ?.async("string");
    // The site name has non ASCII characters, so the serializer quotes it.
    expect(siteDocument).toContain('name: "Panadería María"');
    expect(productDocument).toContain("name: Tarta de manzana");
    expect(productDocument).toContain("price: 19.99");
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
    await expect(page.getByText("This field is required.")).toBeVisible();
    await expect(page.getByText("Enter a valid price")).toBeVisible();

    await page.getByLabel("Product name").fill("Apple pie");
    await expect(page.getByRole("button", { name: "apple-pie" })).toBeVisible();
    await page.getByLabel("Price").fill("12.50");

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
      name: "Maria's Bakery",
    });
    expect(JSON.parse(productDocument ?? "")).toEqual({
      name: "Apple pie",
      price: 12.5,
    });
  });
});
