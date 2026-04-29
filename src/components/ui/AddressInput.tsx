import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface StructuredAddress {
  address_line1: string;
  city: string;
  state: string;
  zip: string;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const ZIP_RE = /^\d{5}(-\d{4})?$/;

export interface AddressInputProps {
  value: Partial<StructuredAddress>;
  onChange: (value: StructuredAddress) => void;
  /** Optional callback giving the joined single-line representation */
  onFormattedChange?: (formatted: string) => void;
  className?: string;
  disabled?: boolean;
  showLabels?: boolean;
  required?: boolean;
}

/** Builds a single-line "street, city, state zip" string for legacy display columns. */
export function formatAddress(a: Partial<StructuredAddress>): string {
  const street = a.address_line1?.trim() || "";
  const city = a.city?.trim() || "";
  const state = a.state?.trim() || "";
  const zip = a.zip?.trim() || "";
  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, cityStateZip].filter(Boolean).join(", ");
}

export function AddressInput({ value, onChange, onFormattedChange, className, disabled, showLabels = true, required }: AddressInputProps) {
  const [zipTouched, setZipTouched] = React.useState(false);
  const merged: StructuredAddress = {
    address_line1: value.address_line1 || "",
    city: value.city || "",
    state: value.state || "",
    zip: value.zip || "",
  };

  const update = (patch: Partial<StructuredAddress>) => {
    const next = { ...merged, ...patch };
    onChange(next);
    onFormattedChange?.(formatAddress(next));
  };

  const zipInvalid = zipTouched && !!merged.zip && !ZIP_RE.test(merged.zip);

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        {showLabels && <Label className="text-xs">Street Address {required && <span className="text-destructive">*</span>}</Label>}
        <Input
          value={merged.address_line1}
          onChange={(e) => update({ address_line1: e.target.value })}
          placeholder="123 Main St, Apt 4B"
          disabled={disabled}
          className="rounded-md mt-1 text-sm"
        />
      </div>
      <div className="grid grid-cols-[1fr_90px_110px] gap-2">
        <div>
          {showLabels && <Label className="text-xs">City</Label>}
          <Input
            value={merged.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Nashville"
            disabled={disabled}
            className="rounded-md mt-1 text-sm"
          />
        </div>
        <div>
          {showLabels && <Label className="text-xs">State</Label>}
          <Select value={merged.state || undefined} onValueChange={(v) => update({ state: v })} disabled={disabled}>
            <SelectTrigger className="rounded-md mt-1 h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          {showLabels && <Label className="text-xs">ZIP</Label>}
          <Input
            value={merged.zip}
            onChange={(e) => update({ zip: e.target.value })}
            onBlur={() => setZipTouched(true)}
            placeholder="37212"
            disabled={disabled}
            inputMode="numeric"
            className={cn(
              "rounded-md mt-1 text-sm",
              zipInvalid && "border-destructive focus-visible:ring-destructive",
            )}
          />
          {zipInvalid && <p className="text-[0.65rem] text-destructive mt-0.5">Invalid ZIP</p>}
        </div>
      </div>
    </div>
  );
}

export default AddressInput;