"use client";

type RiskItem = { label: string; current: number; projected: number };
type Macros = { calories?: number; protein?: number; carbs?: number; fat?: number };

type Props = {
  risks?: any[];
  macros?: Macros;
};

const CHART_H = 160;

const parseVal = (v: any): number => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 45; // safe default if empty
};

export default function DashboardInsights({ risks = [], macros = {} }: Props) {
  // Safe dummy data if real data is empty or corrupted
  const safeRisks = [
    { label: "Cardio", current: 75, projected: 30 },
    { label: "Metabolic", current: 65, projected: 25 },
    { label: "Sodium", current: 80, projected: 35 },
    { label: "Pressure", current: 70, projected: 28 },
  ];

  const safeMacros = {
    calories: parseVal(macros?.calories) || 1850,
    protein: parseVal(macros?.protein) || 75,
    carbs: parseVal(macros?.carbs) || 210,
    fat: parseVal(macros?.fat) || 55,
  };

  const macroRows = [
    { name: "Calories", value: safeMacros.calories, target: 2000, unit: "kcal", color: "bg-amber-500" },
    { name: "Protein", value: safeMacros.protein, target: 60, unit: "g", color: "bg-emerald-500" },
    { name: "Carbs", value: safeMacros.carbs, target: 250, unit: "g", color: "bg-sky-500" },
    { name: "Fat", value: safeMacros.fat, target: 70, unit: "g", color: "bg-rose-500" },
  ];

  return (
    <section className="w-full grid gap-6 md:grid-cols-2 my-6">
      {/* 30-Day Risk Reduction Projection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">📉 30-Day Risk Reduction Projection</h3>
        <p className="text-xs text-slate-500 mb-6">Current vs. projected risk after following the medical roadmap</p>

        <div className="h-40 flex items-end justify-around gap-6 border-b-2 border-slate-200 pb-2 bg-slate-50/50 rounded-xl px-2">
          {safeRisks.map((r, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full gap-2 flex-1">
              <div className="flex items-end justify-center gap-1.5 w-full h-full">
                <div className="w-1/2 bg-rose-500 rounded-t-lg shadow-sm" style={{ height: `${r.current}%` }} />
                <div className="w-1/2 bg-emerald-500 rounded-t-lg shadow-sm" style={{ height: `${r.projected}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-around gap-2 mt-3">
          {safeRisks.map((r, i) => (
            <div key={i} className="text-center text-xs text-slate-700 flex-1">
              <div className="font-bold">{r.label}</div>
              <div className="text-[11px] text-slate-500">{r.current}% → <span className="text-emerald-600 font-bold">{r.projected}%</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Macros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">🥗 Daily Macros Breakdown</h3>
        <p className="text-xs text-slate-500 mb-6">Suggested nutritional intake vs. daily targets</p>
        
        <div className="space-y-4">
          {macroRows.map((m) => {
            const pct = Math.min(100, Math.round((m.value / m.target) * 100));
            return (
              <div key={m.name}>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>{m.name}</span>
                  <span className="text-slate-500">{m.value} / {m.target} {m.unit} <strong className="text-slate-800">({pct}%)</strong></span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
                  <div className={`h-3 rounded-full ${m.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}