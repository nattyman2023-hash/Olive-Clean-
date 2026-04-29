import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput, isPhoneValid } from "@/components/ui/PhoneInput";
import { AddressInput, type StructuredAddress, formatAddress } from "@/components/ui/AddressInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddLeadDrawer({ open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState<Partial<StructuredAddress>>({});
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [frequency, setFrequency] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setName(""); setEmail(""); setPhone(undefined); setAddress({});
    setBedrooms(""); setBathrooms(""); setFrequency(""); setUrgency(""); setNotes("");
  };

  const save = async () => {
    if (!name.trim() && !email.trim() && !phone) {
      toast.error("Provide at least a name, email, or phone.");
      return;
    }
    if (phone && !isPhoneValid(phone)) {
      toast.error("Phone number isn't valid.");
      return;
    }
    setSaving(true);
    const payload: any = {
      name: name.trim() || null,
      email: email.trim().toLowerCase() || null,
      phone: phone || null,
      location: formatAddress(address) || null,
      address_line1: address.address_line1 || null,
      city: address.city || null,
      state: address.state || null,
      zip: address.zip || null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      frequency: frequency || null,
      urgency: urgency || null,
      notes: notes.trim() || null,
      source: "manual",
      status: "new",
      score: 50,
    };
    const { error } = await supabase.from("leads").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Failed to add lead: " + error.message);
      return;
    }
    toast.success("Lead added");
    reset();
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Add Lead</SheetTitle>
          <SheetDescription className="text-xs">
            Manually log a lead from a phone call, walk-in, or referral.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="rounded-md mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="rounded-md mt-1 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <div className="mt-1"><PhoneInput value={phone} onChange={setPhone} /></div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Address</Label>
            <AddressInput value={address} onChange={setAddress} showLabels={false} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bedrooms</Label>
              <Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="rounded-md mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Bathrooms</Label>
              <Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="rounded-md mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="rounded-md mt-1 h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger className="rounded-md mt-1 h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asap">ASAP</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-md mt-1 text-sm" placeholder="Anything useful from the call…" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Add Lead
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}