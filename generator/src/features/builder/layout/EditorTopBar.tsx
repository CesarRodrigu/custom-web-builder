/**
 * Top bar of the configuration editor: the sidebar trigger, the entry to the
 * export page, the language mockup button and the theme toggle.
 */
import { Download, Globe } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Props of the editor top bar. */
interface EditorTopBarProps {
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
  /** Called when the user requests the export page. */
  onOpenExport: () => void;
}

/**
 * Renders the editor top bar with the navigation actions of the editor.
 * @param props Top bar texts and its export callback.
 * @returns The top bar markup.
 */
export function EditorTopBar(props: Readonly<EditorTopBarProps>) {
  const { texts, onOpenExport } = props;
  return (
    <header className="flex items-center justify-between border-b px-4 py-1">
      <SidebarTrigger />
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onOpenExport}>
          <Download />
          {texts.exportSection}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={texts.languageMockupLabel}
          title={texts.comingSoon}
        >
          <Globe />
        </Button>
        <ModeToggle />
      </div>
    </header>
  );
}

export default EditorTopBar;
