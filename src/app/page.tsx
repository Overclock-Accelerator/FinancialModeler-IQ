"use client";

import { useState, useCallback } from "react";
import { FinancialModel, AnalysisResult, ResearchResult, AIMetrics } from "@/lib/types";
import { ModelSelector } from "@/components/ModelSelector";
import { ModelTable } from "@/components/ModelTable";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ResearchPanel } from "@/components/ResearchPanel";
import { MetricsBar } from "@/components/MetricsBar";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet");
  const [financialModel, setFinancialModel] = useState<FinancialModel | null>(null);
  const [generateMetrics, setGenerateMetrics] = useState<AIMetrics | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ model: financialModel, modelId: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(null);
    }
  }, [financialModel, selectedModel]);

  const handleResearch = useCallback(async () => {
    if (!financialModel) return;
    setLoading("research");
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: financialModel, modelId: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResearch(data.research);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(null);
    }
  }, [financialModel, selectedModel]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPrompt(
          `Here is an existing financial model to use as a starting point:\n\n${text}`
        );
      };
      reader.readAsText(file);
    },
    []
  );

  const handleExportCSV = useCallback(() => {
    if (!financialModel) return;
    const headers = ["Category", "Item", "Year 1", "Year 2", "Year 3", "Notes"];
    const rows = financialModel.rows.map((r) =>
      [
        `"${r.category}"`,
        `"${r.item}"`,
        r.year1,
        r.year2,
        r.year3,
        `"${r.notes}"`,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${financialModel.title.replace(/\s+/g, "_")}_model.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [financialModel]);

  const handleShare = useCallback(() => {
    if (!financialModel) return;
    const compressed = btoa(
      encodeURIComponent(JSON.stringify(financialModel))
    );
    const shareUrl = `${window.location.origin}/share?data=${compressed}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Share link copied to clipboard!");
  }, [financialModel]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              FinancialModeler
              <span className="ml-1 text-blue-500">IQ</span>
            </h1>
            <p className="text-sm text-slate-400">
              AI-powered financial modeling &mdash; generate, analyze, benchmark
            </p>
          </div>
          <ModelSelector
            selectedModelId={selectedModel}
            onChange={setSelectedModel}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Input Section */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">
              Describe your business
            </h2>
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50">
              Upload file
              <input
                type="file"
                accept=".csv,.txt,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A food truck in Austin, TX specializing in gourmet tacos. Operating 6 days a week, 2 employees, average ticket $14. Planning to add a second truck in Year 2..."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading !== null}
              className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading === "generate" ? "Generating..." : "Generate Model"}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!financialModel || loading !== null}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading === "analyze" ? "Analyzing..." : "Analyze Model"}
            </button>
            <button
              onClick={handleResearch}
              disabled={!financialModel || loading !== null}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading === "research"
                ? "Researching..."
                : "Research Benchmarks"}
            </button>

            {financialModel && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleShare}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  Share
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
              {loading === "generate" && "Generating your financial model..."}
              {loading === "analyze" && "Analyzing your model..."}
              {loading === "research" && "Researching industry benchmarks..."}
            </div>
          </div>
        )}

        {/* Generated Model */}
        {financialModel && !loading && (
          <section className="space-y-4">
            {generateMetrics && <MetricsBar metrics={generateMetrics} />}
            <ModelTable model={financialModel} />
          </section>
        )}

        {/* Analysis */}
        {analysis && !loading && <AnalysisPanel analysis={analysis} />}

        {/* Research */}
        {research && !loading && <ResearchPanel research={research} />}

        {/* Empty State */}
        {!financialModel && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">📊</div>
            <h3 className="text-lg font-semibold text-slate-700">
              No model yet
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              Describe a business above and click &ldquo;Generate Model&rdquo;
              to create an AI-powered 3-year financial projection.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
