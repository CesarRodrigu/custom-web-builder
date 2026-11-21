/**
 * Single labeled select field with an optional hint and a real-time
 * validation message, built on the shadcn select so a closed set of values
 * uses the same control and field anatomy as the rest of the design system.
 */
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Value used internally for the option that leaves the draft field unset. */
const EMPTY_OPTION_VALUE = "__none__";

/**
 * Maps an option value to the value carried by the select item. Empty values
 * need a sentinel because the select treats them as "no selection".
 * @param value Value of the option as stored in the draft.
 * @returns Value carried by the select item.
 */
function toItemValue(value: string): string {
  return value === "" ? EMPTY_OPTION_VALUE : value;
}

/** One option of a select field. */
export interface SelectFieldOption {
  /** Value stored in the draft when the option is selected. */
  value: string;
  /** Localized text shown for the option. */
  label: string;
}

/** Props of one labeled select field. */
export interface SelectFieldProps {
  /** DOM id shared by the label and the select trigger. */
  id: string;
  /** Localized label text. */
  label: string;
  /** Options shown in the select, in display order. */
  options: readonly SelectFieldOption[];
  /** Controlled value of the select. */
  value: string;
  /** Localized validation message, or `undefined` while the field is valid. */
  errorText?: string;
  /** Localized helper text rendered below the select. */
  description?: string;
  /** Called with the new value whenever the selection changes. */
  onChange: (value: string) => void;
}

/**
 * Renders one labeled select of the editor as a `Field`, with the validation
 * message right after the optional helper text.
 * @param props Controlled select settings, including its error message.
 * @returns The labeled select element.
 */
export function SelectField(props: Readonly<SelectFieldProps>) {
  const { id, label, options, value, errorText, description, onChange } = props;
  // Base UI prints the raw value in the trigger unless the label map is given.
  const items = Object.fromEntries(
    options.map((option) => [toItemValue(option.value), option.label]),
  );
  return (
    <Field data-invalid={errorText ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={toItemValue(value)}
        onValueChange={(next) =>
          onChange(next === EMPTY_OPTION_VALUE || next === null ? "" : next)
        }
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-invalid={errorText ? true : undefined}
        >
          <SelectValue placeholder={options[0]?.label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={toItemValue(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {errorText && <FieldError>{errorText}</FieldError>}
    </Field>
  );
}

export default SelectField;
