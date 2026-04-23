"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FinancialModel } from "@/lib/types";
import { ModelTable } from "@/components/ModelTable";

function SharedModelContent() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">No model data provided.</p>
      </div>
    );
  }

  let model: FinancialModel;
  try {
    model = JSON.parse(decodeURIComponent(atob(data)));
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-400">Invalid or corrupted model data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              FinancialModeler
              <span className="ml-1 text-blue-500">IQ</span>
            </h1>
            <p className="text-sm text-slate-400">Shared financial model</p>
          </div>
          <a
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            Create your own
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ModelTable model={model} />
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-400">Loading shared model...</p>
        </div>
      }
    >
      <SharedModelContent />
    </Suspense>
  );
}
