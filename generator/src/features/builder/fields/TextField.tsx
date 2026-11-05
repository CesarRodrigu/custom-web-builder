/**
 * Single labeled text input with an optional hint and a real-time
 * validation message, composed with the shadcn `Field` family so the
 * editor follows the same field anatomy as the rest of the UI kit.
 *
 * Extracted from `ConfigEditor` so the editor keeps one responsibility per
 * component.
 */
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Props of one labeled text input. */
export interface TextFieldProps {
  /** DOM id shared by the label and the input. */
  id: string;
  /** Localized label text. */
  label: string;
  /** Optional localized placeholder text. */
  placeholder?: string;
  /** Controlled value of the input. */
  value: string;
  /** Localized validation message, or `undefined` while the field is valid. */
  errorText?: string;
  /** Localized helper text rendered below the input. */
  description?: string;
  /** Whether the input must be filled in; marks the label with an asterisk. */
  required?: boolean;
  /** Called with the new value whenever the user types. */
  onChange: (value: string) => void;
}

/**
 * Renders one labeled text input of the editor as a `Field`: required
 * inputs get an asterisk in their label and an invalid input switches the
 * whole field into its error state, showing the validation message in
 * `FieldError` right after the optional helper text.
 * @param props Controlled input settings, including its error message.
 * @returns The labeled input element.
 */
export function TextField(props: Readonly<TextFieldProps>) {
  const {
    id,
    label,
    placeholder,
    value,
    errorText,
    description,
    required,
    onChange,
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
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={errorText ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {errorText && <FieldError>{errorText}</FieldError>}
    </Field>
  );
}

export default TextField;
