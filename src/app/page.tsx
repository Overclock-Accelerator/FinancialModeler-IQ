"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AIMetrics,
  AnalysisResult,
  ChatMessage,
  FinancialModel,
  ResearchResult,
} from "@/lib/types";
import { computeModel } from "@/lib/compute";
import { exportToExcel } from "@/lib/exportExcel";
import { ModelSelector } from "@/components/ModelSelector";
import { ModelTable } from "@/components/ModelTable";
import { DriversPanel } from "@/components/DriversPanel";
import { UnitEconomics } from "@/components/UnitEconomics";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ResearchPanel } from "@/components/ResearchPanel";
import { MetricsBar } from "@/components/MetricsBar";
import { ChatDock } from "@/components/ChatDock";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import {
  GENERATE_SYSTEM_PROMPT,
  ANALYZE_SYSTEM_PROMPT,
  RESEARCH_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT,
  SAMPLE_PROMPT_SYSTEM_PROMPT,
} from "@/lib/prompts";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4-1-nano");
  const [financialModel, setFinancialModel] = useState<FinancialModel | null>(
    null
  );
  const [driverValues, setDriverValues] = useState<Record<string, number[]>>(
    {}
  );
  const [generateMetrics, setGenerateMetrics] = useState<AIMetrics | null>(
    null
  );
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJSON, setShowRawJSON] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [activePromptTab, setActivePromptTab] = useState("generate");
  const [researchScrollNonce, setResearchScrollNonce] = useState(0);
  const researchSectionRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [modelHistory, setModelHistory] = useState<FinancialModel[]>([]);

  // Seed driver state whenever a new model arrives.
  useEffect(() => {
    if (!financialModel) {
      setDriverValues({});
      return;
    }
    const initial: Record<string, number[]> = {};
    for (const d of financialModel.drivers) {
      initial[d.id] = [...d.values];
    }
    setDriverValues(initial);
  }, [financialModel]);

  const computed = useMemo(() => {
    if (!financialModel) return null;
    try {
      return computeModel(financialModel, driverValues);
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [financialModel, driverValues]);

  const dirty = useMemo(() => {
    if (!financialModel) return false;
    for (const d of financialModel.drivers) {
      const cur = driverValues[d.id];
      if (!cur) continue;
      for (let i = 0; i < d.values.length; i++) {
        if (cur[i] !== d.values[i]) return true;
      }
    }
    return false;
  }, [financialModel, driverValues]);

  const unitEconItems = useMemo(
    () =>
      computed?.lineItems.filter(
        (li) => li.category === "UnitEconomics" || li.isUnitEconomic
      ) ?? [],
    [computed]
  );

  const handleDriverChange = useCallback(
    (driverId: string, periodIndex: number, value: number) => {
      setDriverValues((prev) => {
        const current = prev[driverId] ?? [];
        const next = [...current];
        next[periodIndex] = value;
        return { ...prev, [driverId]: next };
      });
    },
    []
  );

  const handleResetDrivers = useCallback(() => {
    if (!financialModel) return;
    const initial: Record<string, number[]> = {};
    for (const d of financialModel.drivers) initial[d.id] = [...d.values];
    setDriverValues(initial);
  }, [financialModel]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading("generate");
    setError(null);
    setAnalysis(null);
    setResearch(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelId: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFinancialModel(data.model);
      setGenerateMetrics(data.metrics);
      setChatHistory([]);
      setModelHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  }, [prompt, selectedModel]);

  const handleAnalyze = useCallback(async () => {
    if (!financialModel) return;
    setLoading("analyze");
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: financialModel,
          modelId: selectedModel,
          driverOverrides: driverValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(null);
    }
  }, [financialModel, selectedModel, driverValues]);

  const handleResearch = useCallback(async () => {
    if (!financialModel) return;
    setLoading("research");
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: financialModel,
          modelId: selectedModel,
          driverOverrides: driverValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResearch(data.research);
      setResearchScrollNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(null);
    }
  }, [financialModel, selectedModel, driverValues]);

  useEffect(() => {
    if (researchScrollNonce === 0) return;
    researchSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [researchScrollNonce]);

  const handleChatModelUpdate = useCallback(
    (
      model: FinancialModel,
      metrics: AIMetrics,
      _userMessage: string,
      _assistantMessage: string
    ) => {
      // Push current model onto the undo stack before replacing.
      if (financialModel) {
        setModelHistory((prev) => [...prev, financialModel]);
      }
      setFinancialModel(model);
      setGenerateMetrics(metrics);
      // Keep analysis/research visible — they remain useful context even after edits.
    },
    [financialModel]
  );

  const handleChatUndo = useCallback(() => {
    setModelHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const restored = next.pop()!;
      setFinancialModel(restored);
      setAnalysis(null);
      setResearch(null);
      return next;
    });
  }, []);

  const handleSamplePrompt = useCallback(async () => {
    setLoading("samplePrompt");
    setError(null);
    try {
      const res = await fetch("/api/sample-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrompt(data.prompt);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate sample prompt"
      );
    } finally {
      setLoading(null);
    }
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (!financialModel || !computed) return;
    await exportToExcel(financialModel, computed);
  }, [financialModel, computed]);

  const handleShare = useCallback(() => {
    if (!financialModel) return;
    // Bake the current driver state into the shared model so the recipient
    // sees the exact scenario being shared.
    const snapshot: FinancialModel = {
      ...financialModel,
      drivers: financialModel.drivers.map((d) => ({
        ...d,
        values: driverValues[d.id] ?? d.values,
      })),
    };
    const compressed = btoa(encodeURIComponent(JSON.stringify(snapshot)));
    const shareUrl = `${window.location.origin}/share?data=${compressed}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Share link copied to clipboard!");
  }, [financialModel, driverValues]);

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#080808]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1
              className="text-3xl font-light tracking-[0.12em] text-white"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              FinancialModeler<span className="font-semibold"> IQ</span>
            </h1>
            <p className="mt-0.5 text-xs tracking-wider text-[#555]">
              AI-powered · driver-based · formula-driven
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSystemPrompt(true)}
              className="border border-[#333] px-2.5 py-1.5 text-xs font-medium tracking-widest text-[#555] uppercase transition-colors hover:border-[#555] hover:text-[#aaa]"
            >
              System Prompts
            </button>
            <button
              onClick={() => setShowRawJSON((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium tracking-widest uppercase transition-colors ${
                showRawJSON
                  ? "bg-white text-black"
                  : "border border-[#333] text-[#555] hover:border-[#555] hover:text-[#aaa]"
              }`}
            >
              {showRawJSON ? "{ } Raw JSON ON" : "{ } Raw JSON"}
            </button>
            <ModelSelector
              selectedModelId={selectedModel}
              onChange={setSelectedModel}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Input Section */}
        <CollapsiblePanel
          title="Describe your business"
          titleLevel={2}
          headerRight={
            <button
              type="button"
              onClick={handleSamplePrompt}
              disabled={loading !== null}
              className="border border-[#333] bg-transparent px-3 py-1.5 text-xs font-medium tracking-widest text-[#888] uppercase transition-colors hover:border-[#555] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              {loading === "samplePrompt" ? "Generating…" : "AI Random Prompt"}
            </button>
          }
          contentClassName="space-y-4 p-6 pt-0"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A food truck in Austin, TX specializing in gourmet tacos. Operating 6 days a week, 2 employees, average ticket $14. Planning to add a second truck in Year 2..."
            rows={10}
            className="w-full resize-none border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 text-sm leading-relaxed text-[#ddd] placeholder:text-[#3a3a3a] focus:border-[#555] focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading !== null}
              className="bg-white px-5 py-2.5 text-xs font-semibold tracking-widest text-black uppercase transition-all hover:bg-[#e0e0e0] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {loading === "generate" ? "Generating..." : "Generate Model"}
            </button>

            {financialModel && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="border border-[#333] px-3 py-2 text-xs font-medium tracking-widest text-[#888] uppercase transition-colors hover:border-[#555] hover:text-white"
                >
                  Export Excel
                </button>
                <button
                  onClick={handleShare}
                  className="border border-[#333] px-3 py-2 text-xs font-medium tracking-widest text-[#888] uppercase transition-colors hover:border-[#555] hover:text-white"
                >
                  Share
                </button>
              </div>
            )}
          </div>
        </CollapsiblePanel>

        {/* Error */}
        {error && (
          <div className="border border-[#3a1a1a] bg-[#1a0a0a] px-4 py-3 text-sm text-[#ff7070]">
            {error}
          </div>
        )}

        {/* Loading indicator */}
        {loading && loading !== "samplePrompt" && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-4 text-xs tracking-widest text-[#555] uppercase">
              <div className="h-4 w-4 animate-spin border border-[#444] border-t-white" />
              {loading === "generate" && "Generating your financial model..."}
              {loading === "analyze" && "Analyzing your model..."}
              {loading === "research" && "Researching industry benchmarks..."}
            </div>
          </div>
        )}

        {/* Generated Model */}
        {financialModel && computed && (!loading || loading === "samplePrompt" || loading === "analyze" || loading === "research") && (
          <>
            {generateMetrics && (
              <CollapsiblePanel
                title="Generation metrics"
                subtitle="Token usage, cost, and duration for the last model build"
                contentClassName="p-0"
              >
                <MetricsBar metrics={generateMetrics} />
              </CollapsiblePanel>
            )}

            {showRawJSON && (
              <div className="overflow-hidden border border-[#333]">
                <div className="flex items-center justify-between border-b border-[#222] bg-[#0d0d0d] px-4 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555]">
                    Raw AI Response — Financial Model (JSON)
                  </span>
                  <span className="text-[10px] text-[#444]">
                    This is the structured data powering the model below
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto bg-[#060606] p-4 text-xs leading-relaxed text-emerald-400">
                  {JSON.stringify(financialModel, null, 2)}
                </pre>
              </div>
            )}

            <DriversPanel
              drivers={financialModel.drivers}
              periods={financialModel.periods}
              values={driverValues}
              onChange={handleDriverChange}
              onReset={handleResetDrivers}
              dirty={dirty}
            />

            <UnitEconomics
              items={unitEconItems}
              periods={financialModel.periods}
            />

            <ModelTable
              model={financialModel}
              lineItems={computed.lineItems}
            />
          </>
        )}

        {/* Analysis */}
        {analysis && (!loading || loading === "samplePrompt" || loading === "analyze" || loading === "research") && (
          <>
            {showRawJSON && (
              <div className="overflow-hidden border border-[#333]">
                <div className="flex items-center justify-between border-b border-[#222] bg-[#0d0d0d] px-4 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555]">
                    Raw AI Response — Analysis (JSON)
                  </span>
                  <span className="text-[10px] text-[#444]">
                    This is the structured data powering the analysis below
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto bg-[#060606] p-4 text-xs leading-relaxed text-emerald-400">
                  {JSON.stringify(analysis, null, 2)}
                </pre>
              </div>
            )}
            <AnalysisPanel analysis={analysis} />
          </>
        )}

        {/* Research */}
        {research && (!loading || loading === "samplePrompt" || loading === "analyze" || loading === "research") && (
          <div ref={researchSectionRef} className="scroll-mt-6 space-y-4">
            {showRawJSON && (
              <div className="overflow-hidden border border-[#333]">
                <div className="flex items-center justify-between border-b border-[#222] bg-[#0d0d0d] px-4 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555]">
                    Raw AI Response — Research (JSON)
                  </span>
                  <span className="text-[10px] text-[#444]">
                    This is the structured data powering the research below
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto bg-[#060606] p-4 text-xs leading-relaxed text-emerald-400">
                  {JSON.stringify(research, null, 2)}
                </pre>
              </div>
            )}
            <ResearchPanel research={research} />
          </div>
        )}

        {/* Empty State */}
        {!financialModel && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p
              className="text-4xl font-light tracking-[0.15em] text-[#2a2a2a]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              No Model Yet
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#444]">
              Describe a business above and click &ldquo;Generate Model&rdquo;
              to build a driver-based financial model with tunable assumptions,
              unit economics, and a live P&amp;L.
            </p>
          </div>
        )}
      </main>

      {/* Chat dock — only visible once a model exists */}
      {financialModel && (
        <ChatDock
          financialModel={financialModel}
          driverValues={driverValues}
          selectedModelId={selectedModel}
          chatHistory={chatHistory}
          canUndo={modelHistory.length > 0}
          analysis={analysis}
          research={research}
          onModelUpdate={handleChatModelUpdate}
          onHistoryUpdate={setChatHistory}
          onUndo={handleChatUndo}
          onAnalyze={handleAnalyze}
          onResearch={handleResearch}
          analyzing={loading === "analyze"}
          researching={loading === "research"}
        />
      )}

      {/* System Prompts Modal */}
      {showSystemPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSystemPrompt(false)}>
          <div className="mx-4 max-h-[85vh] w-full max-w-3xl overflow-hidden border border-[#333] bg-[#0a0a0a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#222] px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold tracking-widest text-white uppercase">System Prompts</h2>
                <p className="mt-0.5 text-xs text-[#555]">This app uses 5 different prompts — one per AI operation</p>
              </div>
              <button onClick={() => setShowSystemPrompt(false)} className="p-1.5 text-[#555] hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <div className="flex border-b border-[#222]">
              {[
                { id: "generate", label: "Generate" },
                { id: "analyze", label: "Analyze" },
                { id: "research", label: "Research" },
                { id: "edit", label: "Chat Edit" },
                { id: "sample", label: "Sample Prompt" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePromptTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                    activePromptTab === tab.id
                      ? "border-b-2 border-white text-white"
                      : "text-[#555] hover:text-[#aaa]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="overflow-auto p-6" style={{ maxHeight: "calc(85vh - 140px)" }}>
              <pre className="whitespace-pre-wrap rounded bg-[#060606] p-4 text-sm leading-relaxed text-emerald-400 font-mono ring-1 ring-[#222]">
                {activePromptTab === "generate" && GENERATE_SYSTEM_PROMPT}
                {activePromptTab === "analyze" && ANALYZE_SYSTEM_PROMPT}
                {activePromptTab === "research" && RESEARCH_SYSTEM_PROMPT}
                {activePromptTab === "edit" && EDIT_SYSTEM_PROMPT}
                {activePromptTab === "sample" && SAMPLE_PROMPT_SYSTEM_PROMPT}
              </pre>
            </div>
            <div className="border-t border-[#222] px-6 py-3">
              <p className="text-[11px] text-[#444]">
                Source: <code className="rounded bg-[#151515] px-1 py-0.5 text-[10px] text-[#666]">src/lib/prompts.ts</code> &middot; Each prompt shapes a different AI operation in the app
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
