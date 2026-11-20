/**
 * Presentation constants of the catalog shared by the product components.
 */

/** Currency every product price is formatted in. */
export const catalogCurrency = "EUR";

/** Number of products the home page shows in its featured section. */
export const featuredProductCount = 3;

/** Number of products rendered on each page of the product catalog. */
export const productsPageSize = 6;

/**
 * Localized labels shared by the product card and the product detail page.
 *
 * Every page texts object includes this contract so the shared product
 * components can render the status badges and the stock line without knowing
 * the page-specific copy.
 */
export interface ProductTexts {
  /** Badge label of a product flagged as recommended. */
  statusRecommended: string;
  /** Badge label of a product flagged as not for sale. */
  statusNotForSale: string;
  /** Label shown before the available stock. */
  stockLabel: string;
}
