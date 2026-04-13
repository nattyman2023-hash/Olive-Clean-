import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Phone, MessageCircle, StickyNote, Zap, CheckCircle2, Circle, Loader2, Plus } from "lucide-react";

const NOTE_ICONS: Record<string, React.ElementType> = {
  phone_call: Phone,
  chat: MessageCircle,
  system: Zap,
  note: StickyNote,
};

interface ActivityTimelineProps {
  parentType: "lead" | "client" | "job";
  parentId: string;
}

export default function ActivityTimeline({ parentType, parentId }: ActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [isTask, setIsTask] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["crm-notes", parentType, parentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_notes")
        .select("*")
        .eq("parent_type", parentType)
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("crm_notes").insert({
        parent_type: parentType,
        parent_id: parentId,
        author_id: user?.id || null,
        content: newNote.trim(),
        note_type: noteType,
        is_task: isTask,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notes", parentType, parentId] });
      setNewNote("");
      setIsTask(false);
      setShowForm(false);
      toast.success("Note added");
    },
    onError: (e) => toast.error("Failed: " + (e as Error).message),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("crm_notes").update({ is_completed: completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notes", parentType, parentId] });
    },
  });

  return (
    <div className="space-y-3">
      {/* Add Note */}
      {!showForm ? (
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" /> Add Note
        </Button>
      ) : (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 ml-auto">
              <Switch checked={isTask} onCheckedChange={setIsTask} className="scale-75" />
              <span className="text-[0.65rem] text-muted-foreground">Task</span>
            </div>
          </div>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type your note..."
            className="text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={() => addNote.mutate()} disabled={!newNote.trim() || addNote.isPending}>
              {addNote.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
          {notes.map((note: any) => {
            const Icon = NOTE_ICONS[note.note_type] || StickyNote;
            return (
              <div key={note.id} className="relative pl-8 py-2">
                <div className="absolute left-1.5 top-3 w-3 h-3 rounded-full bg-card border border-border flex items-center justify-center">
                  <Icon className="h-2 w-2 text-muted-foreground" />
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {note.is_task && (
                      <button
                        onClick={() => toggleComplete.mutate({ id: note.id, completed: !note.is_completed })}
                        className="float-left mr-1.5 mt-0.5"
                      >
                        {note.is_completed
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                      </button>
                    )}
                    <p className={`text-xs text-foreground ${note.is_task && note.is_completed ? "line-through opacity-50" : ""}`}>
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.6rem] text-muted-foreground">
                        {format(new Date(note.created_at), "MMM d, h:mm a")}
                      </span>
                      <Badge variant="outline" className="text-[0.55rem] px-1 py-0 capitalize">
                        {note.note_type.replace("_", " ")}
                      </Badge>
                      {note.is_task && !note.is_completed && (
                        <Badge variant="secondary" className="text-[0.55rem] px-1 py-0 bg-amber-100 text-amber-800">Task</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
