/**
 * Mobile viewport detection of the shadcn sidebar: tracks whether the
 * viewport is below the mobile breakpoint, re-checked on every resize
 * through the `matchMedia` change event.
 */
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Reports whether the viewport currently fits the mobile breakpoint.
 * @returns True when the viewport is narrower than 768 pixels.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
