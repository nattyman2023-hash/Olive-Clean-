import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { StickyNote, Search, Loader2, Check } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  email: string | null;
  type: "lead" | "client";
}

export default function QuickNoteButton() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const s = `%${q}%`;
    const [leads, clients] = await Promise.all([
      supabase.from("leads").select("id, name, email").or(`name.ilike.${s},email.ilike.${s}`).limit(5),
      supabase.from("clients").select("id, name, email").or(`name.ilike.${s},email.ilike.${s}`).limit(5),
    ]);
    const r: SearchResult[] = [
      ...(leads.data || []).map((l: any) => ({ id: l.id, name: l.name || l.email || "Unknown", email: l.email, type: "lead" as const })),
      ...(clients.data || []).map((c: any) => ({ id: c.id, name: c.name, email: c.email, type: "client" as const })),
    ];
    setResults(r);
    setSearching(false);
  };

  const handleSave = async () => {
    if (!selected || !note.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("crm_notes").insert({
      parent_type: selected.type,
      parent_id: selected.id,
      author_id: user?.id || null,
      content: note.trim(),
      note_type: noteType,
    });
    setSaving(false);
    if (error) { toast.error("Failed to save note"); return; }
    toast.success(`Note added to ${selected.name}`);
    setNote("");
    setSelected(null);
    setSearchQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Quick Note">
          <StickyNote className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <p className="text-xs font-semibold text-foreground mb-2">Quick Note</p>

        {!selected ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search lead or client..."
                className="pl-8 h-8 text-xs"
                autoFocus
              />
            </div>
            {searching && <p className="text-[0.65rem] text-muted-foreground">Searching...</p>}
            {results.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => setSelected(r)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{r.name}</span>
                    <span className="text-[0.6rem] text-muted-foreground capitalize">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
              <span className="text-xs font-medium">{selected.name}</span>
              <button onClick={() => setSelected(null)} className="text-[0.6rem] text-primary hover:underline">Change</button>
            </div>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Type your note..."
              className="text-xs min-h-[60px]"
              autoFocus
            />
            <Button size="sm" className="w-full text-xs" onClick={handleSave} disabled={saving || !note.trim()}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Save Note
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
