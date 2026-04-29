import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput, isPhoneValid } from "@/components/ui/PhoneInput";
import { AddressInput, type StructuredAddress, formatAddress } from "@/components/ui/AddressInput";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateClient } from "@/lib/findOrCreateClient";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Called once a client_id is resolved (existing or newly created). */
  onResolved: (clientId: string, clientName: string) => void;
  /** Currently locked-in client id (if any). */
  resolvedClientId?: string | null;
  resolvedClientName?: string | null;
  onClear?: () => void;
}

export default function ClientLookupOrCreate({ onResolved, resolvedClientId, resolvedClientName, onClear }: Props) {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState<Partial<StructuredAddress>>({});
  const [creating, setCreating] = useState(false);

  // Live search (debounced)
  useEffect(() => {
    if (resolvedClientId) return;
    if (query.trim().length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      const { data } = await supabase
        .from("clients")
        .select("id, name, email, phone, address")
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(8);
      setResults(data || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, resolvedClientId]);

  if (resolvedClientId && resolvedClientName) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-emerald-700" />
          <span className="font-medium text-emerald-900">{resolvedClientName}</span>
        </div>
        {onClear && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClear}>Change</Button>
        )}
      </div>
    );
  }

  const createClient = async () => {
    if (!name.trim()) { toast.error("Client name is required."); return; }
    if (phone && !isPhoneValid(phone)) { toast.error("Phone number isn't valid."); return; }
    setCreating(true);
    try {
      const id = await findOrCreateClient({
        name: name.trim(),
        email: email.trim().toLowerCase() || null,
        phone: phone || null,
        address: formatAddress(address) || null,
        address_line1: address.address_line1 || null,
        city: address.city || null,
        state: address.state || null,
        zip: address.zip || null,
      });
      onResolved(id, name.trim());
      toast.success("Client ready");
    } catch (e: any) {
      toast.error("Could not create client: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
        <Button
          type="button"
          variant={mode === "search" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setMode("search")}
        >
          <Search className="h-3.5 w-3.5" /> Find existing
        </Button>
        <Button
          type="button"
          variant={mode === "create" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setMode("create")}
        >
          <UserPlus className="h-3.5 w-3.5" /> New client
        </Button>
      </div>

      {mode === "search" ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, or phone…"
              className="pl-9 rounded-md text-sm"
            />
          </div>
          {searching && <p className="text-[0.65rem] text-muted-foreground">Searching…</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No matches. <button className="text-primary hover:underline" onClick={() => { setName(query); setMode("create"); }}>Create a new client</button>
            </p>
          )}
          {results.length > 0 && (
            <div className="border border-border rounded-md divide-y divide-border max-h-56 overflow-y-auto">
              {results.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                  onClick={() => onResolved(c.id, c.name)}
                >
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md mt-1 text-sm" />
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
          <Button size="sm" onClick={createClient} disabled={creating} className="w-full">
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Use this client
          </Button>
        </div>
      )}
    </div>
  );
}