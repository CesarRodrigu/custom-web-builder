import { Badge } from "@/components/ui/badge";

interface BadgeLinkProps {
  /** Target URL of the link. */
  href: string;
  /** Visible text of the badge, also used as the accessible name. */
  label: string;
}

/**
 * Renders a badge as an anchor with the shadcn `render` prop.
 *
 * The `render` prop is the documented way to keep the badge styles on a link.
 * This wrapper exists because Astro templates cannot pass a JSX element as a
 * prop, and keeps the badge variant in a single place.
 * @param props Link target and visible label.
 * @returns An anchor rendered with the secondary badge styles.
 */
export function BadgeLink(props: Readonly<BadgeLinkProps>) {
  const { href, label } = props;

  return (
    <Badge variant="secondary" render={<a href={href} aria-label={label} />}>
      {label}
    </Badge>
  );
}
