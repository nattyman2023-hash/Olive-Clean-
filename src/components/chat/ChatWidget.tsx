import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const INITIAL_SUGGESTIONS = [
  "Get a free quote",
  "What services do you offer?",
  "What areas do you serve?",
];

const MID_SUGGESTIONS = [
  "I'd like weekly cleaning",
  "Tell me about deep cleaning",
  "Book an estimate",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>(INITIAL_SUGGESTIONS);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Animate greeting on open
  useEffect(() => {
    if (open && messages.length === 0) {
      setShowGreeting(false);
      const t = setTimeout(() => {
        setMessages([{
          role: "assistant",
          content: "Hey there! 👋 I'm **Olivia**, your Olive Clean concierge. Looking for a sparkling clean home in Nashville? I can get you a quote in about 30 seconds! ✨\n\nWhat can I help you with?",
        }]);
        setShowGreeting(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [open]);

  const createLead = async () => {
    const { data } = await supabase
      .from("leads")
      .insert({ source: "chatbot", status: "new", score: 0 } as any)
      .select("id")
      .single();
    if (data) {
      setLeadId((data as any).id);
      return (data as any).id;
    }
    return null;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setSuggestedReplies([]);

    try {
      let currentLeadId = leadId;
      if (!currentLeadId) {
        currentLeadId = await createLead();
      }

      const { data, error } = await supabase.functions.invoke("chat-process", {
        body: { messages: updated.map(m => ({ role: m.role, content: m.content })), lead_id: currentLeadId },
      });

      if (error) throw error;
      const reply = data?.reply || "Sorry, I'm having trouble right now. Please try calling us at (615) 555-0142!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);

      // Use suggested replies from AI or fallback
      if (data?.suggested_replies?.length) {
        setSuggestedReplies(data.suggested_replies);
      } else {
        setSuggestedReplies(updated.length > 3 ? MID_SUGGESTIONS : INITIAL_SUGGESTIONS);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "Oops, something went wrong. You can reach us at **(615) 555-0142** or [book online](/book)!" }]);
      setSuggestedReplies(["Try again", "Book online"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6 group-hover:hidden" />
          <Sparkles className="h-6 w-6 hidden group-hover:block" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-4rem)] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-lg">
                🫒
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Olivia</p>
                <p className="text-[0.65rem] text-primary-foreground/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Online • Olive Clean
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-primary-foreground/10 rounded transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Typing indicator before greeting */}
            {messages.length === 0 && !showGreeting && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs mr-2 mt-1 shrink-0">
                    🫒
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent text-accent-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-w-none [&_a]:text-primary [&_a]:underline">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs mr-2 mt-1 shrink-0">
                  🫒
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Quick-reply chips */}
            {!loading && suggestedReplies.length > 0 && messages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedReplies.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                className="rounded-full h-9 w-9 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-center text-[0.6rem] text-muted-foreground/50 mt-2">
              Powered by Olive Clean AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}
