/**
 * Localized strings of the configuration editor.
 *
 * Exported so every locale page can type its `texts` object and get the same
 * compile-time check; the object literal is the only thing that differs
 * between locales.
 */

/** Localized strings of the editor, the only difference between locales. */
export interface BuilderTexts {
  /** Heading of the site configuration section. */
  siteSection: string;
  /** Label of the site name input. */
  siteNameLabel: string;
  /** Placeholder of the site name input. */
  siteNamePlaceholder: string;
  /** Helper text shown under the site name input. */
  siteNameHint: string;
  /** Label of the business description input. */
  siteDescriptionLabel: string;
  /** Placeholder of the business description input. */
  siteDescriptionPlaceholder: string;
  /** Helper text shown under the business description input. */
  siteDescriptionHint: string;
  /** Label of the contact email input. */
  siteContactEmailLabel: string;
  /** Placeholder of the contact email input. */
  siteContactEmailPlaceholder: string;
  /** Helper text shown under the contact email input. */
  siteContactEmailHint: string;
  /** Message shown on the site page while the catalog has no products yet. */
  productsEmpty: string;
  /** Label of the button that appends an empty product to the catalog. */
  addProduct: string;
  /** Label of the button that removes one product. */
  removeProduct: string;
  /** Title of the confirmation dialog opened before removing one product. */
  removeProductTitle: string;
  /** Body of the confirmation dialog opened before removing one product. */
  removeProductDescription: string;
  /** Label of the button that closes the confirmation dialog keeping the product. */
  removeProductCancel: string;
  /** Label of the button that confirms the removal of the product. */
  removeProductRemove: string;
  /** Accessible name of the delete action revealed on a product row of the sidebar tree. */
  deleteProduct: string;
  /** Heading of the category area of a product page. */
  productCategoriesLabel: string;
  /** Label of the category input of a product page. */
  productCategoryLabel: string;
  /** Placeholder of the category input, showing the `/` separator. */
  productCategoryPlaceholder: string;
  /** Label of the button that adds the typed category to the product. */
  addCategory: string;
  /** Label of the product name input. */
  productNameLabel: string;
  /** Placeholder of the product name input. */
  productNamePlaceholder: string;
  /** Helper text shown under the product name input. */
  productNameHint: string;
  /** Label of the product description input. */
  productDescriptionLabel: string;
  /** Placeholder of the product description input. */
  productDescriptionPlaceholder: string;
  /** Helper text shown under the product description input. */
  productDescriptionHint: string;
  /** Label of the product price input. */
  productPriceLabel: string;
  /** Placeholder of the product price input. */
  productPricePlaceholder: string;
  /** Helper text shown under the product price input. */
  productPriceHint: string;
  /** Label of the product image URL input. */
  productImageUrlLabel: string;
  /** Placeholder of the product image URL input. */
  productImageUrlPlaceholder: string;
  /** Helper text shown under the product image URL input. */
  productImageUrlHint: string;
  /** Heading of the export section. */
  exportSection: string;
  /** Label of the export format selector. */
  exportFormatLabel: string;
  /** Label of the button that downloads the configuration. */
  exportButton: string;
  /** Hint shown while the configuration is invalid and the export is blocked. */
  exportDisabledHint: string;
  /** Localized label of every export format, keyed by its format id. */
  exportFormatLabels: Readonly<Record<string, string>>;
  /** Message for any empty required field. */
  errorRequired: string;
  /** Message for a malformed contact email. */
  errorEmail: string;
  /** Message for a malformed price. */
  errorPrice: string;
  /** Message for a malformed image URL. */
  errorUrl: string;
  /** Message for a malformed category path. */
  errorCategory: string;
  /** Message for a product whose name another product already uses. */
  errorDuplicate: string;
  /** Accessible name of the mockup language selector in the top bar. */
  languageMockupLabel: string;
  /** Title explaining that the top bar mockups are not implemented yet. */
  comingSoon: string;
  /** Message inside the sidebar while the catalog has no products yet. */
  sidebarProductsEmpty: string;
  /** Fallback name of a product whose name the user has not typed yet. */
  unnamedProduct: string;
}
