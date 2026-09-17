"use client";

import { useState } from "react";
import { useEveAgent } from "eve/react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const agent = useEveAgent();
  const [input, setInput] = useState("");

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || isResuming) return;
    void agent.send(message, isBusy ? { turnPolicy: "steer" } : undefined);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-3.5 text-primary" />
          Nerve-Pulse Assistant
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close assistant"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {agent.data.messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about your open signals, how to phrase a capture, or how the
            workflow works.
          </p>
        )}
        {agent.data.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-surface text-foreground",
            )}
          >
            {message.parts.map((part, i) =>
              part.type === "text" ? (
                <p key={i} className="whitespace-pre-wrap leading-relaxed">
                  {part.text}
                </p>
              ) : null,
            )}
          </div>
        ))}
        {isBusy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </div>
        )}
        {agent.status === "error" && (
          <p className="text-xs text-critical">
            Something went wrong. Try sending your message again.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-border p-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isResuming}
          placeholder="Ask the assistant…"
          className="flex-1 rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isResuming || !input.trim()}
          className="flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
