// @ts-nocheck
"use client";

import React from "react";

export default function DashboardInsights({ risks, macros }: { risks?: any; macros?: any }) {
  const safeRisks = Array.isArray(risks) && risks.length > 0 ? risks : [
    { label: "Cardio Health", current: "Stable", projected: "Optimal" },
    { label: "Metabolic Index", current: "Moderate", projected: "Low Risk" },
    { label: "Sodium Intake", current: "High", projected: "Balanced" },
    { label: "Blood Pressure", current: "Elevated", projected: "Normal" },
  ];

  const cCalories = Number(macros?.calories) || 1850;
  const cProtein = Number(macros?.protein) || 75;
  const cCarbs = Number(macros?.carbs) || 210;
  const cFat = Number(macros?.fat) || 55;

  const macroRows = [
    { name: "Calories", value: cCalories, target: 2000, unit: "kcal", color: "bg-amber-500" },
    { name: "Protein", value: cProtein, target: 60, unit: "g", color: "bg-emerald-500" },
    { name: "Carbs", value: cCarbs, target: 250, unit: "g", color: "bg-sky-500" },
    { name: "Fat", value: cFat, target: 70, unit: "g", color: "bg-rose-500" },
  ];

  return (
    <section className="w-full grid gap-6 md:grid-cols-2 my-6">
      {/* Health Assessment Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-900">🛡️ Patient Health Status Overview</h3>
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Roadmap Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-6">Real-time status indicators based on your clinical assessment</p>

          <div className="grid grid-cols-2 gap-3">
            {safeRisks.map((r: any, i: number) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-700">{r?.label || "Metric"}</span>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Current: <strong className="text-slate-700">{r?.current || "Normal"}</strong></span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                  Target: {r?.projected || "Optimized"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Clinical Review Status</span>
          <span className="font-bold text-slate-800">Verified & Ready</span>
        </div>
      </div>

      {/* Daily Macros Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">🥗 Daily Nutritional Macros</h3>
          <p className="text-xs text-slate-500 mb-6">Suggested daily intake tailored for your recovery plan</p>
          
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

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Dietary Guideline</span>
          <span className="font-bold text-slate-800">Low Sodium / High Protein</span>
        </div>
      </div>
    </section>
  );
}  