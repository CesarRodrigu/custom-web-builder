/**
 * Export view of the configuration editor: lets the user choose an export
 * format and download the validated configuration.
 *
 * Extracted from `ConfigEditor` so the editor keeps one responsibility per
 * component and the export flow can evolve independently.
 */
import { useState } from "react";
import JSZip from "jszip";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { buildExportFileName } from "@/lib/export/archive";
import {
  defaultExportFormat,
  exportFormats,
  getExportFormat,
  type ExportFormat,
  type ExportFormatId,
  type RegisteredExportFormat,
} from "@/lib/export/formats/format";
import { buildSiteFileMap } from "@/lib/export/package";
import type { SiteConfig, SiteConfigValidation } from "@/lib/catalog/schema";
import type { BuilderTexts } from "@/features/builder/builder-texts";

/** Props of the export view. */
interface ExportViewProps {
  /** Localized strings of the editor. */
  texts: BuilderTexts;
  /** Validation result of the current draft. */
  validation: SiteConfigValidation;
}

/**
 * Triggers the browser download of one binary blob, named as requested.
 * @param blob Content of the file to download.
 * @param fileName Suggested download file name.
 */
function saveBlob(blob: Blob, fileName: string): void {
  const fileUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(fileUrl);
}

/**
 * Builds the ZIP of the whole configuration package (site file plus one file
 * per product inside its category folder chains) and downloads it.
 * @param config Validated site configuration.
 * @param format Selected export format, describing MIME type and extension.
 */
async function downloadPackage(
  config: SiteConfig,
  format: ExportFormat,
): Promise<void> {
  const packageZip = new JSZip();
  for (const [filePath, content] of Object.entries(
    buildSiteFileMap(config, format),
  )) {
    packageZip.file(filePath, content);
  }
  const packageBlob = await packageZip.generateAsync({
    type: "blob",
    mimeType: format.mimeType,
  });
  saveBlob(packageBlob, buildExportFileName(config));
}

/**
 * Downloads the validated configuration in the selected format: the package
 * format goes through `downloadPackage`, the single-file formats serialize
 * the configuration as a plain document.
 * @param config Validated site configuration.
 * @param format Selected export format, which describes the MIME type and
 * the file extension.
 */
async function downloadConfiguration(
  config: SiteConfig,
  format: ExportFormat,
): Promise<void> {
  await downloadPackage(config, format);
}

/**
 * Renders the export view: format selector, download button and the hint
 * shown while the configuration is invalid.
 * @param props Export view props.
 * @returns The export view markup.
 */
export default function ExportView(props: Readonly<ExportViewProps>) {
  const { texts, validation } = props;
  const [formatId, setFormatId] = useState<ExportFormatId>(
    defaultExportFormat.id,
  );
  const format = getExportFormat(formatId) ?? defaultExportFormat;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{texts.exportSection}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="export-format" className="text-sm font-medium">
            {texts.exportFormatLabel}
          </label>
          <Combobox
            items={exportFormats}
            itemToStringLabel={(item) =>
              texts.exportFormatLabels[item.id] ?? item.id
            }
            itemToStringValue={(item) =>
              texts.exportFormatLabels[item.id] ?? item.id
            }
            value={format}
            onValueChange={(selected) => {
              const selectedFormat = selected as RegisteredExportFormat;
              setFormatId(selectedFormat.id);
            }}
          >
            <ComboboxInput id="export-format" />
            <ComboboxContent>
              <ComboboxList>
                {exportFormats.map((exportFormat) => (
                  <ComboboxItem key={exportFormat.id} value={exportFormat}>
                    {texts.exportFormatLabels[exportFormat.id] ??
                      exportFormat.id}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <Button
          type="button"
          aria-disabled={!validation.valid}
          className={
            !validation.valid ? "pointer-events-auto opacity-50" : undefined
          }
          onClick={() => {
            if (!validation.valid) {
              toast.add({
                type: "error",
                title: texts.exportSection,
                description: texts.exportDisabledHint,
              });
              return;
            }
            void downloadConfiguration(validation.config, format);
          }}
        >
          {texts.exportButton}
        </Button>
      </div>
      {!validation.valid && (
        <output className="text-sm text-muted-foreground">
          {texts.exportDisabledHint}
        </output>
      )}
    </section>
  );
}
