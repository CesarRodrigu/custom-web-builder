/**
 * Bean Validation constraints that the standard annotations cannot express.
 *
 * <p>Each constraint is an annotation plus its validator, and it reports its violation on the property the client has
 * to correct, so the {@code 400} response keeps the same {@code field → message} shape as the rest of the API. The
 * rules covered here are the sort whitelist, the order between two price bounds and the shape of an image reference.
 */
package com.customwebbuilder.catalog.validation;
