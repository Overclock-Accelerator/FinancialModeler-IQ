"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { FinancialModel } from "@/lib/types";
import { ModelTable } from "@/components/ModelTable";
import { UnitEconomics } from "@/components/UnitEconomics";
import { computeModel } from "@/lib/compute";

function SharedModelContent() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  const parsed = useMemo(() => {
    if (!data) return null;
    try {
      const model = JSON.parse(decodeURIComponent(atob(data))) as FinancialModel;
      const computed = computeModel(model);
      return { model, computed };
    } catch {
      return null;
    }
  }, [data]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">No model data provided.</p>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-700">Invalid or corrupted model data.</p>
      </div>
    );
  }

  const { model, computed } = parsed;
  const unitEconItems = computed.lineItems.filter(
    (li) => li.category === "UnitEconomics" || li.isUnitEconomic
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              FinancialModeler
              <span className="ml-1 text-blue-600">IQ</span>
            </h1>
            <p className="text-sm text-slate-600">Shared financial model</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Create your own
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <UnitEconomics items={unitEconItems} periods={model.periods} />
        <ModelTable model={model} lineItems={computed.lineItems} />
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">Loading shared model...</p>
        </div>
      }
    >
      <SharedModelContent />
    </Suspense>
  );
}
