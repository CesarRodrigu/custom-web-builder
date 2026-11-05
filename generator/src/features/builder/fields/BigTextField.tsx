/**
 * Single labeled multi-line text input with an optional hint and a
 * real-time validation message, composed with the shadcn `Field` family and
 * the `Textarea` control for long free text such as descriptions.
 *
 * Sibling of `TextField`: it keeps the same props contract and swaps the
 * one-line `Input` for a `Textarea` that grows with its content.
 */
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { TextFieldProps } from "@/features/builder/fields/TextField";

/**
 * Props of one labeled multi-line text input: the same contract as
 * `TextFieldProps`, since only the rendered control differs.
 */
export type BigTextFieldProps = TextFieldProps;

/**
 * Renders one labeled multi-line text input of the editor as a `Field`:
 * required inputs get an asterisk in their label and an invalid value
 * switches the whole field into its error state, showing the validation
 * message in `FieldError` right after the optional helper text.
 * @param props Controlled input settings, including its error message.
 * @returns The labeled textarea element.
 */
export function BigTextField(props: Readonly<BigTextFieldProps>) {
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
      <Textarea
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

export default BigTextField;
