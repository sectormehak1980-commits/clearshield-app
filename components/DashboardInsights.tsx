"use client";

type RiskItem = { label: string; current: number; projected: number };
type Macros = { calories?: number; protein?: number; carbs?: number; fat?: number };

type Props = {
  risks?: RiskItem[];
  macros?: Macros;
  currency?: string; // not used here, handy if you add cost figures later
};

const CHART_H = 160; // px, matches h-40

const toNum = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const barPx = (pct: number) => Math.max(6, Math.round((clamp(pct) / 100) * CHART_H));

export default function DashboardInsights({ risks = [], macros = {} }: Props) {
  const safeRisks = risks.map((r) => ({
    label: String(r?.label ?? "Risk"),
    current: clamp(toNum(r?.current)),
    projected: clamp(toNum(r?.projected)),
  }));

  const macroRows = [
    { name: "Calories", value: toNum(macros.calories), target: 2000, unit: "kcal", color: "bg-amber-500" },
    { name: "Protein", value: toNum(macros.protein), target: 60, unit: "g", color: "bg-emerald-500" },
    { name: "Carbs", value: toNum(macros.carbs), target: 250, unit: "g", color: "bg-sky-500" },
    { name: "Fat", value: toNum(macros.fat), target: 70, unit: "g", color: "bg-rose-500" },
  ];

  return (
    <section className="w-full grid gap-6 md:grid-cols-2 my-6">
      {/* 30-Day Risk Reduction Projection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">30-Day Risk Reduction Projection</h3>
        <p className="text-xs text-slate-500 mb-4">Current vs. projected risk after following the roadmap</p>

        {safeRisks.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-slate-400">
            No risk data yet. Analyze a report to see projections.
          </div>
        ) : (
          <>
            <div className="h-40 flex items-end justify-around gap-4 border-b border-slate-200">
              {safeRisks.map((r, i) => (
                <div key={`${r.label}-${i}`} className="flex items-end gap-1">
                  <div className="w-6 bg-red-500 rounded-t" style={{ height: barPx(r.current) }} title={`Current ${r.current}%`} />
                  <div className="w-6 bg-green-500 rounded-t" style={{ height: barPx(r.projected) }} title={`Projected ${r.projected}%`} />
                </div>
              ))}
            </div>
            <div className="flex justify-around gap-4 mt-2">
              {safeRisks.map((r, i) => (
                <div key={`l-${r.label}-${i}`} className="text-center text-xs text-slate-600 w-14">
                  <div className="truncate">{r.label}</div>
                  <div className="font-semibold">{r.current}% → {r.projected}%</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 bg-red-500 rounded-sm" /> Current</span>
              <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 bg-green-500 rounded-sm" /> Projected</span>
            </div>
          </>
        )}
      </div>

      {/* Daily Macros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Daily Macros</h3>
        <p className="text-xs text-slate-500 mb-4">Suggested intake vs. daily target</p>
        <div className="space-y-4">
          {macroRows.map((m) => {
            const pct = m.target > 0 ? clamp((m.value / m.target) * 100) : 0;
            return (
              <div key={m.name}>
                <div className="flex justify-between text-sm text-slate-700 mb-1">
                  <span>{m.name}</span>
                  <span>{m.value} / {m.target} {m.unit} ({Math.round(pct)}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-3 rounded-full ${m.color}`} style={{ width: `${pct}%`, minWidth: m.value > 0 ? 6 : 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
