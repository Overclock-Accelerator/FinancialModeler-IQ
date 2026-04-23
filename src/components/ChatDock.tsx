"use client";

import { useEffect, useRef, useState } from "react";
import { AIMetrics, AnalysisResult, ChatMessage, FinancialModel, ResearchResult } from "@/lib/types";

interface ChatDockProps {
  financialModel: FinancialModel;
  driverValues: Record<string, number[]>;
  selectedModelId: string;
  chatHistory: ChatMessage[];
  canUndo: boolean;
  analysis: AnalysisResult | null;
  research: ResearchResult | null;
  onModelUpdate: (
    model: FinancialModel,
    metrics: AIMetrics,
    userMessage: string,
    assistantMessage: string
  ) => void;
  onHistoryUpdate: (history: ChatMessage[]) => void;
  onUndo: () => void;
  onAnalyze: () => void;
  onResearch: () => void;
  analyzing: boolean;
  researching: boolean;
}

export function ChatDock({
  financialModel,
  driverValues,
  selectedModelId,
  chatHistory,
  canUndo,
  analysis,
  research,
  onModelUpdate,
  onHistoryUpdate,
  onUndo,
  onAnalyze,
  onResearch,
  analyzing,
  researching,
}: ChatDockProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, open]);

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    }
  }, [open]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: trimmed },
    ];
    onHistoryUpdate(newHistory);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentModel: financialModel,
          driverOverrides: driverValues,
          history: chatHistory,
          message: trimmed,
          modelId: selectedModelId,
          analysis,
          research,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { role: "assistant", content: data.message },
      ];
      onHistoryUpdate(updatedHistory);
      onModelUpdate(data.model, data.metrics, trimmed, data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
      // Roll back optimistic user message on failure.
      onHistoryUpdate(chatHistory);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded panel */}
      {open && (
        <div className="flex h-[520px] w-[400px] flex-col overflow-hidden border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl shadow-black/60">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[#222] bg-[#111] px-4 py-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-white uppercase">
                Refine Model
              </p>
              <p className="mt-0.5 text-[10px] text-[#555] tracking-wide">
                Ask the AI to change anything
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canUndo && (
                <button
                  onClick={onUndo}
                  title="Revert last AI edit"
                  className="border border-[#333] px-2 py-1 text-[10px] font-medium tracking-widest text-[#888] uppercase transition-colors hover:border-[#555] hover:text-white"
                >
                  Undo
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-[#555] transition-colors hover:text-white"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1l12 12M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatHistory.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-xs text-[#444] leading-relaxed max-w-[260px]">
                  Describe any change — add a revenue stream, adjust margins,
                  extend to 5 years, restructure the P&amp;L, anything.
                </p>
                <div className="mt-4 space-y-1.5 w-full">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="w-full border border-[#222] px-3 py-2 text-left text-[11px] text-[#555] transition-colors hover:border-[#333] hover:text-[#888]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-white text-black"
                      : "border border-[#222] bg-[#161616] text-[#ccc]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="border border-[#222] bg-[#161616] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#555] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#555] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#555] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="border border-[#3a1a1a] bg-[#1a0a0a] px-3 py-2 text-[11px] text-[#ff7070]">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[#222] bg-[#0d0d0d] p-3">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="E.g. Add a weekend catering revenue stream..."
                rows={2}
                disabled={loading}
                className="flex-1 resize-none border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-xs leading-relaxed text-[#ddd] placeholder:text-[#333] focus:border-[#444] focus:outline-none disabled:opacity-40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="self-end bg-white px-3 py-2 text-[10px] font-semibold tracking-widest text-black uppercase transition-all hover:bg-[#e0e0e0] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Send
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-[#333]">
              Enter to send &middot; Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Follow-on action buttons */}
      <button
        onClick={onResearch}
        disabled={researching || analyzing}
        className="flex items-center gap-2 border border-[#333] bg-[#111] px-4 py-2.5 text-xs font-medium tracking-widest text-[#888] uppercase shadow-lg transition-all hover:border-[#555] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {researching ? (
          <span className="h-3 w-3 animate-spin border border-[#555] border-t-white" />
        ) : (
          <BenchmarkIcon />
        )}
        {researching ? "Researching..." : "Research Benchmarks"}
      </button>

      <button
        onClick={onAnalyze}
        disabled={analyzing || researching}
        className="flex items-center gap-2 border border-[#333] bg-[#111] px-4 py-2.5 text-xs font-medium tracking-widest text-[#888] uppercase shadow-lg transition-all hover:border-[#555] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzing ? (
          <span className="h-3 w-3 animate-spin border border-[#555] border-t-white" />
        ) : (
          <AnalyzeIcon />
        )}
        {analyzing ? "Analyzing..." : "Analyze Model"}
      </button>

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-[#333] bg-transparent px-4 py-2.5 text-xs font-medium tracking-widest text-[#bbb] uppercase shadow-lg transition-all hover:border-[#555] hover:text-white"
      >
        <ChatIcon />
        Refine Model
        {chatHistory.length > 0 && !open && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">
            {Math.floor(chatHistory.length / 2)}
          </span>
        )}
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M1 1h11v8H7.5L4 12V9H1V1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnalyzeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M1 12l3-4 2.5 2L9 5l3 7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BenchmarkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 3.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const QUICK_PROMPTS = [
  "Add a weekend catering revenue stream",
  "Extend the model to 5 years",
  "Add a part-time employee in Year 2",
  "Add depreciation and taxes",
];
