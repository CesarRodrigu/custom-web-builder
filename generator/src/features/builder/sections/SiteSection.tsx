/**
 * Site configuration page of the editor: the metadata fields of the site
 * plus the message shown while the catalog has no products yet.
 */
import BigTextField from "@/features/builder/fields/BigTextField";
import TextField from "@/features/builder/fields/TextField";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import { siteInputId } from "@/features/builder/editor-section";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { PackageOpen } from "lucide-react";
import { SiteTextField, type SiteMetaDraft } from "@/lib/catalog/schema";

/** Props of the site configuration page. */
interface SiteSectionProps {
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
  /** Site metadata being edited. */
  site: SiteMetaDraft;
  /** Whether the catalog already holds at least one product. */
  hasProducts: boolean;
  /**
   * Localized validation message of a field, or `undefined` while it is
   * valid; receives the dotted field path, like `site.name`.
   */
  getError: (field: string) => string | undefined;
  /** Called with the field and its new value whenever the user types. */
  onChange: (field: keyof SiteMetaDraft, value: string) => void;
}

/**
 * Renders the site configuration page with its metadata fields and the
 * catalog empty state.
 * @param props Page texts, the site draft and its change callbacks.
 * @returns The page markup.
 */
export function SiteSection(props: Readonly<SiteSectionProps>) {
  const { texts, site, hasProducts, getError, onChange } = props;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{texts.siteSection}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={siteInputId(SiteTextField.Name)}
          label={texts.siteNameLabel}
          placeholder={texts.siteNamePlaceholder}
          description={texts.siteNameHint}
          required
          value={site.name}
          errorText={getError(`site.${SiteTextField.Name}`)}
          onChange={(value) => onChange(SiteTextField.Name, value)}
        />
        <TextField
          id={siteInputId(SiteTextField.ContactEmail)}
          label={texts.siteContactEmailLabel}
          placeholder={texts.siteContactEmailPlaceholder}
          description={texts.siteContactEmailHint}
          value={site.contactEmail}
          errorText={getError(`site.${SiteTextField.ContactEmail}`)}
          onChange={(value) => onChange(SiteTextField.ContactEmail, value)}
        />
      </div>
      <BigTextField
        id={siteInputId(SiteTextField.Description)}
        label={texts.siteDescriptionLabel}
        placeholder={texts.siteDescriptionPlaceholder}
        description={texts.siteDescriptionHint}
        value={site.description}
        errorText={getError(`site.${SiteTextField.Description}`)}
        onChange={(value) => onChange(SiteTextField.Description, value)}
      />
      {!hasProducts && (
        <Empty className="border">
          <EmptyMedia variant="icon">
            <PackageOpen />
          </EmptyMedia>
          <EmptyDescription>{texts.productsEmpty}</EmptyDescription>
        </Empty>
      )}
    </section>
  );
}

export default SiteSection;
