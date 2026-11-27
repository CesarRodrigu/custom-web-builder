/**
 * Labeled SKU input with the regeneration action attached to the control.
 *
 * The action sits at the end of the same input group as the value it changes,
 * so the label stays above the control, the hint and error stay below it and
 * keyboard focus reaches the button right after the input. Identifiers are
 * excluded from spelling correction and autocapitalization because the editor
 * normalizes them itself.
 */
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { RefreshCw } from "lucide-react";

/** Props of the SKU input and its regeneration action. */
export interface SkuFieldProps {
  /** DOM id shared by the label and the input. */
  id: string;
  /** Localized label text. */
  label: string;
  /** Localized label of the regeneration button. */
  generateLabel: string;
  /** Optional localized placeholder text. */
  placeholder?: string;
  /** Localized helper text rendered below the control. */
  description?: string;
  /** Controlled SKU held by the draft. */
  value: string;
  /** Localized validation message, or `undefined` while the field is valid. */
  errorText?: string;
  /** Whether the SKU must be filled in; marks the label with an asterisk. */
  required?: boolean;
  /** Called with the normalized SKU whenever the user types. */
  onChange: (value: string) => void;
  /** Called when the user asks to rebuild the SKU from the current names. */
  onGenerate: () => void;
}

/**
 * Renders the SKU as one field whose input and regeneration button form a
 * single control. An invalid value marks the whole field and shows its
 * message below the helper text, just like the other editor fields.
 * @param props Controlled SKU settings, its action and its error message.
 * @returns The labeled input with its inline action.
 */
export function SkuField(props: Readonly<SkuFieldProps>) {
  const {
    id,
    label,
    generateLabel,
    placeholder,
    description,
    value,
    errorText,
    required,
    onChange,
    onGenerate,
  } = props;
  return (
    <Field data-invalid={errorText ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          value={value}
          placeholder={placeholder}
          required={required}
          aria-invalid={errorText ? true : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
        <InputGroupAddon align="inline-end" className="py-0 pr-1">
          <InputGroupButton
            type="button"
            size="sm"
            variant="outline"
            onClick={onGenerate}
          >
            <RefreshCw aria-hidden="true" />
            {generateLabel}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      {errorText && <FieldError>{errorText}</FieldError>}
    </Field>
  );
}

export default SkuField;
