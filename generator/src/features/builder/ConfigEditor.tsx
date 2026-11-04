/**
 * Configuration editor island: keeps the draft in state, revalidates the
 * whole draft on every keystroke, shows one page at a time (the site
 * configuration, the selected product or the export page reached from the
 * top bar), and only enables the export when the draft satisfies the formal
 * schema. The draft flows through the `DraftPersistence` port, so a reload
 * keeps every typed field, whatever the backing store is.
 *
 * This file is the orchestrator: the pages live in `sections/`
 * (`SiteSection`, `ProductSection` and `ExportView`), the chrome in
 * `chrome/` (`EditorSidebar` and `EditorTopBar`), the reusable inputs in
 * `fields/` (`TextField`, `BigTextField` and `CategoryField`), and the texts contract in
 * `BuilderTexts`.
 */
import { useEffect, useMemo, useState } from "react";
import EditorSidebar from "@/features/builder/layout/EditorSidebar";
import EditorTopBar from "@/features/builder/layout/EditorTopBar";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import {
  goTo,
  productInputId,
  siteInputId,
  toSectionKey,
  type EditorSection,
} from "@/features/builder/editor-section";
import SiteSection from "@/features/builder/sections/SiteSection";
import ProductSection from "@/features/builder/sections/ProductSection";
import ExportView from "@/features/builder/sections/ExportView";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  nextProductId,
  parseSiteConfig,
  type ProductDraft,
  type SiteConfigDraft,
  type SiteConfigValidation,
  type SiteMetaDraft,
  type ValidationCode,
} from "@/lib/catalog/schema";
import { buildFileTree, type FileTreeNode } from "@/lib/catalog/tree";
import { getDraftPersistence } from "@/lib/catalog/persistence/draft-persistence";

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
    products: [],
  };
}

/**
 * Builds the draft of a new catalog entry: an empty product with every field
 * blank and no categories, ready for the user to fill it in.
 * @param id Incremental id assigned to the new product.
 * @returns An empty product draft carrying the given id.
 */
function createEmptyProduct(id: number): ProductDraft {
  return {
    id,
    name: "",
    categories: [],
    description: "",
    price: "",
    imageUrl: "",
  };
}

/**
 * Maps validation issues to the file tree error markers: whether the site
 * file is invalid and which product positions have issues, so the tree can
 * mark the invalid files and every folder above them.
 * @param validation Validation result of the current draft.
 * @returns Site error flag and the set of invalid product indexes.
 */
function toTreeErrors(validation: SiteConfigValidation): {
  siteHasError: boolean;
  productsWithErrors: Set<number>;
} {
  const invalidProducts = new Set<number>();
  let invalidSite = false;
  if (!validation.valid) {
    for (const issue of validation.issues) {
      if (issue.field.startsWith("site.")) {
        invalidSite = true;
        continue;
      }
      if (issue.field.startsWith("products.")) {
        const index = Number(issue.field.split(".")[1]);
        if (Number.isInteger(index)) {
          invalidProducts.add(index);
        }
      }
    }
  }
  return { siteHasError: invalidSite, productsWithErrors: invalidProducts };
}

/**
 * The configuration editor: it holds the draft, revalidates it on every
 * keystroke and composes the sidebar, the top bar and the page of the
 * current section.
 * @param props Component props, holding the localized strings.
 * @returns The editor markup.
 */
export default function ConfigEditor(props: ConfigEditorProps) {
  const { texts } = props;
  const [draft, setDraft] = useState<SiteConfigDraft>(createEmptyDraft);
  const [section, setSection] = useState<EditorSection>({ kind: "config" });
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

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
          if (stored) setDraft(stored);
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
  const { siteHasError, productsWithErrors } = useMemo(
    () => toTreeErrors(validation),
    [validation],
  );
  const messages: Record<ValidationCode, string> = {
    required: texts.errorRequired,
    email: texts.errorEmail,
    price: texts.errorPrice,
    url: texts.errorUrl,
    category: texts.errorCategory,
    duplicate: texts.errorDuplicate,
  };

  /**
   * File tree of the current draft package, rebuilt on every keystroke so
   * the sidebar mirrors exactly what the export would produce.
   * @returns The root nodes of the package tree.
   */
  const fileTree = useMemo(() => buildFileTree(draft), [draft]);

  /**
   * Category paths typed anywhere in the catalog, unique regardless of case
   * and in first use order, so the category combobox can suggest them back.
   * @returns The suggestion list of category paths.
   */
  const categorySuggestions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const path of draft.products.flatMap(
      (product) => product.categories,
    )) {
      const trimmed = path.trim();
      if (trimmed !== "") {
        seen.set(trimmed.toLowerCase(), trimmed);
      }
    }
    return [...seen.values()];
  }, [draft]);

  const sectionKey = toSectionKey(section);
  const selectedProductIndex =
    section.kind === "product" ? section.index : undefined;

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
    setDraft((current) => ({
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
    field: "name" | "description" | "price" | "imageUrl",
    value: string,
  ): void {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, [field]: value } : product,
      ),
    }));
  }

  /**
   * Replaces the categories of one product in the draft.
   * @param index Position of the product being edited.
   * @param categories New category path list selected by the user.
   */
  function updateCategories(index: number, categories: string[]): void {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, categories } : product,
      ),
    }));
  }

  /**
   * Appends one empty product row to the draft and opens its page, so the
   * user lands on the form fields of the new entry. The new product takes
   * the next incremental id, which is never reused after a deletion.
   */
  function addProduct(): void {
    const index = draft.products.length;
    const id = nextProductId(draft.products);
    setDraft((current) => ({
      ...current,
      products: [...current.products, createEmptyProduct(id)],
    }));
    setSection({ kind: "product", index });
  }

  /**
   * Removes one product from the draft and re-plans the open section: the
   * product page being removed closes, and following products shift their
   * sidebar entry positions.
   * @param index Position of the product being removed.
   */
  function removeProduct(index: number): void {
    setDraft((current) => ({
      ...current,
      products: current.products.filter(
        (_, productIndex) => productIndex !== index,
      ),
    }));
    setSection((current) => {
      if (current.kind !== "product") return current;
      if (current.index === index) return { kind: "config" };
      if (current.index > index)
        return { kind: "product", index: current.index - 1 };
      return current;
    });
  }

  /**
   * Opens the page behind one file tree row when the user selects it: the
   * site file leads back to the configuration page and a product file leads
   * to that product page.
   * @param node File tree node the user selected.
   */
  function selectFileNode(node: FileTreeNode): void {
    if (node.type === "file" && node.productIndex !== undefined) {
      setSection({ kind: "product", index: node.productIndex });
      return;
    }
    setSection({ kind: "config" });
  }

  /**
   * Moves the focus to the first control of the page right after it opens,
   * so every section starts ready for typing.
   */
  useEffect(() => {
    if (section.kind === "export") goTo("export-format");
    else if (section.kind === "product")
      goTo(productInputId(section.index, "name"));
    else goTo(siteInputId("name"));
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SidebarProvider>
      <EditorSidebar
        texts={texts}
        fileTree={fileTree}
        hasProducts={draft.products.length > 0}
        selectedProductIndex={selectedProductIndex}
        siteHasError={siteHasError}
        productsWithErrors={productsWithErrors}
        onSelectFileNode={selectFileNode}
        onAddProduct={addProduct}
        onDeleteProduct={removeProduct}
      />
      <SidebarInset>
        <EditorTopBar
          texts={texts}
          onOpenExport={() => setSection({ kind: "export" })}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 pb-10 pt-6">
          {section.kind === "config" && (
            <SiteSection
              texts={texts}
              site={draft.site}
              hasProducts={draft.products.length > 0}
              getError={errorText}
              onChange={updateSite}
            />
          )}
          {section.kind === "product" && draft.products[section.index] && (
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
              onRemove={() => removeProduct(section.index)}
            />
          )}
          {section.kind === "export" && (
            <ExportView texts={texts} validation={validation} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
