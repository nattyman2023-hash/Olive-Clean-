import * as React from "react";
import PhoneInputBase from "react-phone-number-input/input";
import { isValidPhoneNumber } from "libphonenumber-js";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  /** Shown under the input when blur reveals invalid number */
  errorClassName?: string;
  defaultCountry?: "US" | "CA" | "GB";
  id?: string;
}

/**
 * Phone number input with auto-format + libphonenumber validation.
 * Stores E.164 (e.g. +16155550142) but displays formatted national format as user types.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder = "(615) 555-0142", className, disabled, required, errorClassName, defaultCountry = "US", id }, ref) => {
    const [touched, setTouched] = React.useState(false);
    const valid = !value || isValidPhoneNumber(value);
    const showError = touched && !!value && !valid;

    return (
      <div className="space-y-1">
        <PhoneInputBase
          id={id}
          ref={ref as any}
          country={defaultCountry}
          international={false}
          withCountryCallingCode={false}
          value={value || ""}
          onChange={(v) => onChange(v || undefined)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            showError && "border-destructive focus-visible:ring-destructive",
            className,
          )}
        />
        {showError && (
          <p className={cn("text-[0.7rem] text-destructive", errorClassName)}>
            Please enter a valid phone number.
          </p>
        )}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";

/** Helper to validate before submit. Returns true for empty (treat empty separately if required). */
export function isPhoneValid(value: string | undefined | null): boolean {
  if (!value) return true;
  return isValidPhoneNumber(value);
}

export default PhoneInput;