import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** One step of a breadcrumb trail, from the site root to the current page. */
export interface BreadcrumbStep {
  /** Visible label of the step. */
  label: string;
  /** Target URL; the current page omits it and renders as plain text. */
  href?: string;
}

interface BreadcrumbTrailProps {
  /** Steps of the trail, outermost first; the last one is the current page. */
  items: BreadcrumbStep[];
}

/**
 * Renders the shared breadcrumb trail with the shadcn breadcrumb primitives.
 *
 * The component is static markup: it has no client directive, so the trail is
 * rendered on the server and does not ship JavaScript to the browser.
 * @param props Breadcrumb props; `items` lists the steps to render, outermost first.
 * @returns The breadcrumb navigation for the page.
 */
export function BreadcrumbTrail(props: Readonly<BreadcrumbTrailProps>) {
  const { items } = props;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
