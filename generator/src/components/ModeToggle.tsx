import { Moon, Sun } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

import { DARK_THEME_CLASS, Theme } from "@/config/theme";

/**
 * Reads the theme currently applied to the document root, safe for the server
 * render where no document exists.
 * @returns The detected theme, defaulting to light before the app mounts.
 */
function readTheme(): Theme {
  if (typeof document === "undefined") return Theme.Light;
  return document.documentElement.classList.contains(DARK_THEME_CLASS)
    ? Theme.Dark
    : Theme.Light;
}

/**
 * Theme dropdown of the top bar: renders the sun/moon trigger and applies the
 * selected theme to the document root.
 * @returns The theme toggle markup.
 */
export function ModeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const isDark =
      theme === Theme.Dark ||
      (theme === Theme.System &&
        window.matchMedia(`(prefers-color-scheme: ${Theme.Dark})`).matches);
    document.documentElement.classList[isDark ? "add" : "remove"](
      DARK_THEME_CLASS,
    );
  }, [theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme(Theme.Light)}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(Theme.Dark)}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(Theme.System)}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
