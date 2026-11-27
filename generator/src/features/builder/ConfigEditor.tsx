/**
 * Configuration editor island: keeps the draft in state, revalidates the
 * whole draft on every keystroke, shows one page at a time (the site
 * configuration, the selected product, the selected category or the export
 * page reached from the top bar), and only enables the export when the draft
 * satisfies the formal schema. The draft flows through the `DraftPersistence`
 * port, so a reload keeps every typed field, whatever the backing store is.
 *
 * This file is the orchestrator: the pages live in `sections/`
 * (`SiteSection`, `ProductSection`, `CategorySection` and `ExportView`), the chrome in
 * `chrome/` (`EditorSidebar` and `EditorTopBar`), the reusable inputs in
 * `fields/` (`TextField`, `BigTextField` and `CategoryField`), and the texts contract in
 * `BuilderTexts`.
 */
import { useEffect, useMemo, useState } from "react";
import EditorSidebar from "@/features/builder/layout/EditorSidebar";
import EditorTopBar from "@/features/builder/layout/EditorTopBar";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import {
  EditorSectionKind,
  categoryInputId,
  goTo,
  productInputId,
  siteInputId,
  toSectionKey,
  type EditorSection,
} from "@/features/builder/editor-section";
import SiteSection from "@/features/builder/sections/SiteSection";
import ProductSection from "@/features/builder/sections/ProductSection";
import CategorySection from "@/features/builder/sections/CategorySection";
import ExportView from "@/features/builder/sections/ExportView";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  BLANK_PRICE,
  CategoryEditorField,
  nextCategoryId,
  nextProductId,
  parseSiteConfig,
  ProductEditorField,
  removeCategoryFromProducts,
  removeProductFromCategory,
  renameCategoryInProducts,
  SiteTextField,
  toFolderPath,
  toImageListValue,
  toPriceValue,
  toSkuValue,
  toStatusValue,
  toStockValue,
  ValidationCode,
  withAutoSkus,
  withCompleteCategories,
  withFolderAncestors,
  type CategoryDraft,
  type ProductDraft,
  type SiteConfigDraft,
  type SiteConfigValidation,
  type SiteMetaDraft,
} from "@/lib/catalog/schema";
import {
  buildFileTree,
  FileTreeNodeType,
  type FileTreeNode,
} from "@/lib/catalog/tree";
import { getDraftPersistence } from "@/lib/catalog/persistence/draft-persistence";
import { toRelativeFolderPath } from "@/lib/export/package";

/** Props of the configuration editor island. */
interface ConfigEditorProps {
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
}

/** Persistence of the editor draft, resolved once for the app's lifetime. */
const draftPersistence = getDraftPersistence();

/**
 * Builds the draft the editor starts from: no products and every site field
 * blank, ready for the user to fill in.
 * @returns An empty draft.
 */
function createEmptyDraft(): SiteConfigDraft {
  return {
    site: { name: "", description: "", contactEmail: "" },
    folders: [],
    products: [],
    categories: [],
  };
}

/**
 * Builds the draft of a new catalog entry: an empty product with every field
 * blank and no categories, ready for the user to fill it in.
 * @param id Incremental id assigned to the new product.
 * @param folder Relative folder path the product belongs to, blank for the root.
 * @returns An empty product draft carrying the given id and folder.
 */
function createEmptyProduct(id: number, folder: string): ProductDraft {
  return {
    id,
    // Filled from the site and product names by withAutoSkus before rendering.
    sku: "",
    skuAuto: true,
    name: "",
    categories: [],
    folder,
    shortDescription: "",
    longDescription: "",
    price: BLANK_PRICE,
    mainImage: "",
    images: [],
  };
}

/**
 * Builds the draft of a new category: an empty name and description, ready for
 * the user to fill it in.
 * @param id Incremental id assigned to the new category.
 * @returns An empty category draft carrying the given id.
 */
function createEmptyCategory(id: number): CategoryDraft {
  return { id, name: "", description: "" };
}

/**
 * Maps validation issues to the file tree error markers: whether the site
 * file is invalid and which product and category positions have issues, so the
 * tree can mark the invalid files and every folder above them.
 * @param validation Validation result of the current draft.
 * @returns Site error flag and the sets of invalid product and category indexes.
 */
function toTreeErrors(validation: SiteConfigValidation): {
  siteHasError: boolean;
  productsWithErrors: Set<number>;
  categoriesWithErrors: Set<number>;
} {
  const invalidProducts = new Set<number>();
  const invalidCategories = new Set<number>();
  let invalidSite = false;
  if (!validation.valid) {
    for (const issue of validation.issues) {
      if (issue.field.startsWith("site.")) {
        invalidSite = true;
        continue;
      }
      const [collection, rawIndex] = issue.field.split(".");
      const index = Number(rawIndex);
      if (collection === "products" && Number.isInteger(index)) {
        invalidProducts.add(index);
      } else if (collection === "categories" && Number.isInteger(index)) {
        invalidCategories.add(index);
      }
    }
  }
  return {
    siteHasError: invalidSite,
    productsWithErrors: invalidProducts,
    categoriesWithErrors: invalidCategories,
  };
}

/**
 * The configuration editor: it holds the draft, revalidates it on every
 * keystroke and composes the sidebar, the top bar and the page of the
 * current section.
 * @param props Component props, holding the localized strings.
 * @returns The editor markup.
 */
export default function ConfigEditor(props: Readonly<ConfigEditorProps>) {
  const { texts } = props;
  const [draft, setDraft] = useState<SiteConfigDraft>(createEmptyDraft);
  const [section, setSection] = useState<EditorSection>({
    kind: EditorSectionKind.Config,
  });
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [addAttempted, setAddAttempted] = useState(false);

  /**
   * Applies one draft change and refreshes every automatic SKU afterwards, so
   * a generated code follows the current site and product names and never
   * takes a code the user typed for another product.
   * @param transform Change to apply to the current draft.
   */
  function changeDraft(
    transform: (current: SiteConfigDraft) => SiteConfigDraft,
  ): void {
    setDraft((current) =>
      withCompleteCategories(withAutoSkus(transform(current))),
    );
  }

  /**
   * Restores the persisted draft once, right after hydration; the server
   * render keeps the empty draft so the hydrated markup stays stable. The
   * restore runs in a microtask, after the mount render and its effects
   * have settled, so the empty draft never flashes on screen.
   */
  useEffect(() => {
    queueMicrotask(() => {
      void draftPersistence
        .load()
        .then((stored) => {
          if (stored) setDraft(withCompleteCategories(withAutoSkus(stored)));
        })
        .finally(() => setIsDraftLoaded(true));
    });
  }, []);

  /**
   * Persists the whole draft on every change. Runs only after the restore,
   * so the initial empty draft never overwrites the persisted one.
   */
  useEffect(() => {
    if (!isDraftLoaded) return;
    void draftPersistence.save(draft);
  }, [draft, isDraftLoaded]);

  const validation = useMemo(() => parseSiteConfig(draft), [draft]);
  const fieldIssues = useMemo(
    () =>
      validation.valid
        ? new Map<string, ValidationCode>()
        : new Map(validation.issues.map((issue) => [issue.field, issue.code])),
    [validation],
  );
  const { siteHasError, productsWithErrors, categoriesWithErrors } = useMemo(
    () => toTreeErrors(validation),
    [validation],
  );
  const messages: Record<ValidationCode, string> = {
    [ValidationCode.Required]: texts.errorRequired,
    [ValidationCode.Email]: texts.errorEmail,
    [ValidationCode.Price]: texts.errorPrice,
    [ValidationCode.Url]: texts.errorUrl,
    [ValidationCode.MainImage]: texts.errorMainImage,
    [ValidationCode.Category]: texts.errorCategory,
    [ValidationCode.Folder]: texts.errorFolder,
    [ValidationCode.Duplicate]: texts.errorDuplicate,
    [ValidationCode.DuplicateSku]: texts.errorDuplicateSku,
    [ValidationCode.DuplicateCategory]: texts.errorDuplicateCategory,
    [ValidationCode.Sku]: texts.errorSku,
  };

  /**
   * File tree of the current draft package, rebuilt on every keystroke so
   * the sidebar mirrors exactly what the export would produce.
   * @returns The root nodes of the package tree.
   */
  const fileTree = useMemo(() => buildFileTree(draft), [draft]);

  /**
   * Names of the declared categories, unique regardless of case and in editor
   * order, so the category combobox of a product suggests the categories the
   * user can actually edit on their own pages.
   * @returns The suggestion list of category names.
   */
  const categorySuggestions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const category of draft.categories) {
      const trimmed = category.name.trim();
      if (trimmed !== "") {
        seen.set(trimmed.toLowerCase(), trimmed);
      }
    }
    return [...seen.values()];
  }, [draft]);

  const sectionKey = toSectionKey(section);
  const selectedProductIndex =
    section.kind === EditorSectionKind.Product ? section.index : undefined;
  const selectedCategoryIndex =
    section.kind === EditorSectionKind.Category ? section.index : undefined;

  /**
   * Localized validation message of one draft field, or `undefined` while the
   * field is valid.
   * @param field Field path like `site.name` or `products.0.price`.
   * @returns The message for the field's issue code, if any.
   */
  const errorText = (field: string): string | undefined => {
    const code = fieldIssues.get(field);
    return code === undefined ? undefined : messages[code];
  };

  /**
   * Replaces the value of one site field in the draft.
   * @param field Site field being edited.
   * @param value New value typed by the user.
   */
  function updateSite(field: keyof SiteMetaDraft, value: string): void {
    changeDraft((current) => ({
      ...current,
      site: { ...current.site, [field]: value },
    }));
  }

  /**
   * Replaces the value of one plain field of one product in the draft.
   * @param index Position of the product being edited.
   * @param field Product field being edited.
   * @param value New value typed by the user.
   */
  function updateProduct(
    index: number,
    field: ProductEditorField,
    value: string,
  ): void {
    changeDraft((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => {
        if (productIndex !== index) return product;
        switch (field) {
          case ProductEditorField.Sku:
            return { ...product, sku: toSkuValue(value), skuAuto: false };
          case ProductEditorField.Price:
            return { ...product, price: toPriceValue(value) };
          case ProductEditorField.Stock:
            return { ...product, stock: toStockValue(value) };
          case ProductEditorField.Status:
            return { ...product, status: toStatusValue(value) };
          case ProductEditorField.Images:
            return { ...product, images: toImageListValue(value) };
          default:
            return { ...product, [field]: value };
        }
      }),
    }));
  }

  /**
   * Replaces the categories of one product in the draft.
   * @param index Position of the product being edited.
   * @param categories New category path list selected by the user.
   */
  function updateCategories(index: number, categories: string[]): void {
    changeDraft((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, categories } : product,
      ),
    }));
  }

  /**
   * Replaces one field of a category in the draft. A name change also rewrites
   * that name in every product that belongs to the category, so membership and
   * category identity never drift apart.
   * @param index Position of the category being edited.
   * @param field Category field being edited.
   * @param value New value typed by the user.
   */
  function updateCategory(
    index: number,
    field: CategoryEditorField,
    value: string,
  ): void {
    changeDraft((current) => {
      const category = current.categories[index];
      if (!category) return current;
      const products =
        field === CategoryEditorField.Name && value.trim() !== ""
          ? renameCategoryInProducts(
              current.products,
              category.name,
              value.trim(),
            )
          : current.products;
      return {
        ...current,
        products,
        categories: current.categories.map((entry, categoryIndex) =>
          categoryIndex === index ? { ...entry, [field]: value } : entry,
        ),
      };
    });
  }

  /**
   * Removes one product from a category while keeping the product in the
   * catalog. Only the category names of that product are rewritten.
   * @param categoryIndex Position of the category losing the product.
   * @param productIndex Position of the product being removed.
   */
  function removeProductFromCategoryAction(
    categoryIndex: number,
    productIndex: number,
  ): void {
    const category = draft.categories[categoryIndex];
    if (!category) return;
    changeDraft((current) => ({
      ...current,
      products: removeProductFromCategory(
        current.products,
        productIndex,
        category.name,
      ),
    }));
  }

  /**
   * Restores the automatic generation of one product's SKU, so the code is
   * rebuilt from the current site and product names, with a free sequence if
   * the user changed the names after adding the product.
   * @param index Position of the product whose SKU is regenerated.
   */
  function generateSku(index: number): void {
    changeDraft((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, skuAuto: true } : product,
      ),
    }));
  }

  /**
   * Appends one empty product row to the draft and opens its page, so the
   * user lands on the form fields of the new entry. The new product takes
   * the next incremental id, which is never reused after a deletion, and
   * starts in the folder whose add button the user pressed.
   * @param folder Relative folder path of the new product, blank for the root.
   */
  function addProduct(folder = ""): void {
    const index = draft.products.length;
    const id = nextProductId(draft.products);
    setAddAttempted(false);
    changeDraft((current) => ({
      ...current,
      products: [...current.products, createEmptyProduct(id, folder)],
    }));
    setSection({ kind: EditorSectionKind.Product, index });
  }

  /**
   * Focuses the first control of one product that a validation issue points at,
   * so a blocked add jumps to what the user must fix. Category issues have no
   * input with a stable id and are left untouched.
   * @param index Position of the product whose issues are inspected.
   */
  function focusFirstProductError(index: number): void {
    if (validation.valid) return;
    const prefix = `products.${index}.`;
    const issue = validation.issues.find((entry) =>
      entry.field.startsWith(prefix),
    );
    if (!issue) return;
    const field = issue.field.slice(prefix.length).split(".")[0];
    if (field === "categories" || field === "id") return;
    goTo(productInputId(index, field as keyof ProductDraft));
  }

  /**
   * Confirms the product being edited and opens a new empty one, but only when
   * that product has no validation issues. A blocked attempt keeps the user on
   * the same page, focuses the first offending control and reveals the inline
   * message through `addAttempted`.
   * @param index Position of the product being confirmed.
   */
  function commitAndAddProduct(index: number): void {
    if (productsWithErrors.has(index)) {
      setAddAttempted(true);
      focusFirstProductError(index);
      return;
    }
    addProduct(draft.products[index]?.folder ?? "");
  }

  /**
   * Removes one product from the draft and re-plans the open section: the
   * product page being removed closes, and following products shift their
   * sidebar entry positions.
   * @param index Position of the product being removed.
   */
  function removeProduct(index: number): void {
    setAddAttempted(false);
    changeDraft((current) => ({
      ...current,
      products: current.products.filter(
        (_, productIndex) => productIndex !== index,
      ),
    }));
    setSection((current) => {
      if (current.kind !== EditorSectionKind.Product) return current;
      if (current.index === index) return { kind: EditorSectionKind.Config };
      if (current.index > index)
        return {
          kind: EditorSectionKind.Product,
          index: current.index - 1,
        };
      return current;
    });
  }

  /**
   * Appends one empty category row to the draft and opens its page. The new
   * category takes the next incremental id, which is never reused after a
   * deletion.
   */
  function addCategory(): void {
    const index = draft.categories.length;
    const id = nextCategoryId(draft.categories);
    setAddAttempted(false);
    changeDraft((current) => ({
      ...current,
      categories: [...current.categories, createEmptyCategory(id)],
    }));
    setSection({ kind: EditorSectionKind.Category, index });
  }

  /**
   * Confirms the category being edited and opens a new empty one, but only when
   * its name is present and unique. A blocked attempt keeps the user on the
   * same page and reveals the inline message through `addAttempted`.
   * @param index Position of the category being confirmed.
   */
  function commitAndAddCategory(index: number): void {
    if (categoriesWithErrors.has(index)) {
      setAddAttempted(true);
      return;
    }
    addCategory();
  }

  /**
   * Removes one category from the draft and from every product that declared
   * it, then re-plans the open section just like a product deletion does.
   * @param index Position of the category being removed.
   */
  function removeCategory(index: number): void {
    const category = draft.categories[index];
    if (!category) return;
    setAddAttempted(false);
    changeDraft((current) => ({
      ...current,
      products: removeCategoryFromProducts(current.products, category.name),
      categories: current.categories.filter(
        (_, categoryIndex) => categoryIndex !== index,
      ),
    }));
    setSection((current) => {
      if (current.kind !== EditorSectionKind.Category) return current;
      if (current.index === index) return { kind: EditorSectionKind.Config };
      if (current.index > index)
        return {
          kind: EditorSectionKind.Category,
          index: current.index - 1,
        };
      return current;
    });
  }

  /**
   * Creates one folder below the given parent path. The typed value is
   * normalized into a safe path and every ancestor is added, so a nested
   * folder always has the folders above it in the tree and in the export.
   * @param parentPath Folder path that owns the new folder, empty for the root.
   * @param name Folder name or slash separated path typed by the user.
   */
  function addFolder(parentPath: string, name: string): void {
    const parent = toRelativeFolderPath(parentPath);
    const path = toFolderPath([parent, name].filter(Boolean).join("/"));
    if (path === "") return;
    changeDraft((current) => ({
      ...current,
      folders: withFolderAncestors([...current.folders, path]),
    }));
  }

  /**
   * Deletes one folder, its descendants and every assignment to them. The
   * products return to the products root, so no catalog entry is lost.
   * @param folderPath Path of the folder being deleted.
   */
  function deleteFolder(folderPath: string): void {
    const folder = toRelativeFolderPath(folderPath);
    changeDraft((current) => ({
      ...current,
      folders: current.folders.filter(
        (path) => path !== folder && !path.startsWith(`${folder}/`),
      ),
      products: current.products.map((product) =>
        product.folder === folder || product.folder.startsWith(`${folder}/`)
          ? { ...product, folder: "" }
          : product,
      ),
    }));
  }

  /**
   * Assigns one dragged product to the folder it was dropped on. Dropping it
   * on the products root clears its folder.
   * @param productId Incremental id of the dragged product.
   * @param folderPath Target path, `products` for the root.
   */
  function moveProduct(productId: number, folderPath: string): void {
    const folder = toRelativeFolderPath(folderPath);
    changeDraft((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? { ...product, folder } : product,
      ),
    }));
  }

  /**
   * Opens the page behind one file tree row when the user selects it: the
   * site file leads back to the configuration page, and a product or category
   * file leads to its own page.
   * @param node File tree node the user selected.
   */
  function selectFileNode(node: FileTreeNode): void {
    setAddAttempted(false);
    if (node.type !== FileTreeNodeType.File) return;
    if (node.productIndex !== undefined) {
      setSection({ kind: EditorSectionKind.Product, index: node.productIndex });
    } else if (node.categoryIndex !== undefined) {
      setSection({
        kind: EditorSectionKind.Category,
        index: node.categoryIndex,
      });
    } else {
      setSection({ kind: EditorSectionKind.Config });
    }
  }

  /**
   * Moves the focus to the first control of the page right after it opens,
   * so every section starts ready for typing.
   */
  useEffect(() => {
    if (section.kind === EditorSectionKind.Export) goTo("export-format");
    else if (section.kind === EditorSectionKind.Product)
      goTo(productInputId(section.index, ProductEditorField.Name));
    else if (section.kind === EditorSectionKind.Category)
      goTo(categoryInputId(section.index, CategoryEditorField.Name));
    else goTo(siteInputId(SiteTextField.Name));
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SidebarProvider>
      <EditorSidebar
        texts={texts}
        fileTree={fileTree}
        hasProducts={draft.products.length > 0}
        selectedProductIndex={selectedProductIndex}
        selectedCategoryIndex={selectedCategoryIndex}
        siteHasError={siteHasError}
        productsWithErrors={productsWithErrors}
        categoriesWithErrors={categoriesWithErrors}
        onSelectFileNode={selectFileNode}
        onAddProduct={addProduct}
        onAddCategory={addCategory}
        onDeleteProduct={removeProduct}
        onDeleteCategory={removeCategory}
        onAddFolder={addFolder}
        onDeleteFolder={deleteFolder}
        onMoveProduct={moveProduct}
      />
      <SidebarInset>
        <EditorTopBar
          texts={texts}
          onOpenExport={() => setSection({ kind: EditorSectionKind.Export })}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 pb-10 pt-6">
          {section.kind === EditorSectionKind.Config && (
            <SiteSection
              texts={texts}
              site={draft.site}
              hasProducts={draft.products.length > 0}
              getError={errorText}
              onChange={updateSite}
            />
          )}
          {section.kind === EditorSectionKind.Product &&
            draft.products[section.index] && (
              <ProductSection
                texts={texts}
                index={section.index}
                product={draft.products[section.index]}
                categorySuggestions={categorySuggestions}
                getError={errorText}
                onChange={(field, value) =>
                  updateProduct(section.index, field, value)
                }
                onCategoriesChange={(categories) =>
                  updateCategories(section.index, categories)
                }
                onGenerateSku={() => generateSku(section.index)}
                onRemove={() => removeProduct(section.index)}
                onAddNext={() => commitAndAddProduct(section.index)}
                showAddError={
                  addAttempted && productsWithErrors.has(section.index)
                }
              />
            )}
          {section.kind === EditorSectionKind.Category &&
            draft.categories[section.index] && (
              <CategorySection
                texts={texts}
                index={section.index}
                category={draft.categories[section.index]}
                products={draft.products
                  .map((product, index) => ({ product, index }))
                  .filter(({ product }) =>
                    product.categories.some(
                      (name) =>
                        name.trim().toLowerCase() ===
                        draft.categories[section.index]?.name
                          .trim()
                          .toLowerCase(),
                    ),
                  )
                  .map(({ product, index }) => ({ index, name: product.name }))}
                getError={errorText}
                onChange={(field, value) =>
                  updateCategory(section.index, field, value)
                }
                onRemoveProduct={(productIndex) =>
                  removeProductFromCategoryAction(section.index, productIndex)
                }
                onRemove={() => removeCategory(section.index)}
                onAddNext={() => commitAndAddCategory(section.index)}
                showAddError={
                  addAttempted && categoriesWithErrors.has(section.index)
                }
              />
            )}
          {section.kind === EditorSectionKind.Export && (
            <ExportView texts={texts} validation={validation} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
