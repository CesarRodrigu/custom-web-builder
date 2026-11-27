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
  /** Label of the button that confirms the current product and opens a new empty one. */
  addNextProduct: string;
  /** Message shown when the add action is blocked by issues in the current product. */
  addNextProductError: string;
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
  /** Heading of the category management section. */
  categorySection: string;
  /** Label of the category name input. */
  categoryNameLabel: string;
  /** Placeholder of the category name input. */
  categoryNamePlaceholder: string;
  /** Helper text shown under the category name input. */
  categoryNameHint: string;
  /** Label of the category description input. */
  categoryDescriptionLabel: string;
  /** Placeholder of the category description input. */
  categoryDescriptionPlaceholder: string;
  /** Helper text shown under the category description input. */
  categoryDescriptionHint: string;
  /** Heading of the related products list of a category page. */
  categoryProductsLabel: string;
  /** Helper text explaining how products join a category. */
  categoryProductsHint: string;
  /** Message shown when a category has no related products yet. */
  categoryProductsEmpty: string;
  /** Accessible name of the action that removes one product from a category. */
  removeProductFromCategory: string;
  /** Label of the button that appends an empty category to the catalog. */
  addCategoryButton: string;
  /** Label of the button that confirms one category and opens a new empty one. */
  addNextCategory: string;
  /** Message shown when the add category action is blocked by issues. */
  addNextCategoryError: string;
  /** Label of the button that removes one category. */
  removeCategory: string;
  /** Title of the confirmation dialog opened before removing one category. */
  removeCategoryTitle: string;
  /** Body of the confirmation dialog opened before removing one category. */
  removeCategoryDescription: string;
  /** Label of the button that closes the category deletion dialog keeping it. */
  removeCategoryCancel: string;
  /** Label of the button that confirms the deletion of the category. */
  removeCategoryRemove: string;
  /** Accessible name of the delete action on a category row of the sidebar tree. */
  deleteCategory: string;
  /** Fallback name of a category whose name the user has not typed yet. */
  unnamedCategory: string;
  /** Label of the product SKU input. */
  productSkuLabel: string;
  /** Placeholder of the product SKU input. */
  productSkuPlaceholder: string;
  /** Helper text shown under the product SKU input. */
  productSkuHint: string;
  /** Label of the button that regenerates a SKU from the current names. */
  generateSku: string;
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
  /** Label of the long product description input. */
  productLongDescriptionLabel: string;
  /** Placeholder of the long product description input. */
  productLongDescriptionPlaceholder: string;
  /** Helper text shown under the long product description input. */
  productLongDescriptionHint: string;
  /** Label of the product stock input. */
  productStockLabel: string;
  /** Placeholder of the product stock input. */
  productStockPlaceholder: string;
  /** Helper text shown under the product stock input. */
  productStockHint: string;
  /** Label of the product status selector. */
  productStatusLabel: string;
  /** Option of a product with no special status. */
  productStatusNone: string;
  /** Option of a recommended product. */
  productStatusRecommended: string;
  /** Option of a product that is not for sale. */
  productStatusNotForSale: string;
  /** Helper text shown under the product status selector. */
  productStatusHint: string;
  /** Label of the product gallery input. */
  productImagesLabel: string;
  /** Placeholder of the product gallery input. */
  productImagesPlaceholder: string;
  /** Helper text shown under the product gallery input. */
  productImagesHint: string;
  /** Label of the product price input. */
  productPriceLabel: string;
  /** Placeholder of the product price input. */
  productPricePlaceholder: string;
  /** Helper text shown under the product price input. */
  productPriceHint: string;
  /** Label of the product main image input. */
  productMainImageLabel: string;
  /** Placeholder of the product main image input. */
  productMainImagePlaceholder: string;
  /** Helper text shown under the product main image input. */
  productMainImageHint: string;
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
  /** Message for a main image that is not part of the gallery. */
  errorMainImage: string;
  /** Message for a malformed category path. */
  errorCategory: string;
  /** Message for a product whose name another product already uses. */
  errorDuplicate: string;
  /** Message for a malformed product SKU. */
  errorSku: string;
  /** Message for a product whose SKU another product already uses. */
  errorDuplicateSku: string;
  /** Message for a category whose name another category already uses. */
  errorDuplicateCategory: string;
  /** Accessible name of the mockup language selector in the top bar. */
  languageMockupLabel: string;
  /** Title explaining that the top bar mockups are not implemented yet. */
  comingSoon: string;
  /** Message inside the sidebar while the catalog has no products yet. */
  sidebarProductsEmpty: string;
  /** Hint explaining that products can be dragged into folders. */
  sidebarDragHint: string;
  /** Accessible name of the add product action on a user folder, with a `{folder}` placeholder. */
  addProductToFolder: string;
  /** Accessible name of the action that creates a folder at the products root. */
  addFolder: string;
  /** Accessible name of the action that creates a folder inside another folder. */
  addSubfolder: string;
  /** Accessible name of the action that deletes a folder. */
  deleteFolder: string;
  /** Placeholder of the inline input used to name a new folder. */
  folderNamePlaceholder: string;
  /** Label of the button that confirms a new folder name. */
  createFolder: string;
  /** Label of the button that cancels a new folder name. */
  cancelFolder: string;
  /** Title of the confirmation dialog opened before deleting a folder. */
  removeFolderTitle: string;
  /** Body of the confirmation dialog opened before deleting a folder. */
  removeFolderDescription: string;
  /** Label of the button that closes the folder deletion dialog keeping it. */
  removeFolderCancel: string;
  /** Label of the button that confirms the deletion of the folder. */
  removeFolderRemove: string;
  /** Message for a malformed folder path. */
  errorFolder: string;
  /** Fallback name of a product whose name the user has not typed yet. */
  unnamedProduct: string;
}
