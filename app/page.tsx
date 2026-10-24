"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  ClipboardPaste,
  Loader2,
  ScanSearch,
  AlertTriangle,
  ListChecks,
  RotateCcw,
  X,
  Lock,
  CheckCircle2,
  HeartPulse,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Share2,
  Printer,
  MessageCircle,
  Copy,
  MapPin,
  NotebookPen,
} from "lucide-react";

type Tab = "upload" | "paste";

interface AnalysisResult {
  whatIsIt: string;
  isSafe: string;
  nextSteps: string;
}

// Text-size steps applied to the root font size (Tailwind rem units scale with it)
const FONT_SIZES = [16, 18, 20, 22];

export default function ClearShieldPage() {
  // ───────── State (unchanged) ─────────
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [pastedText, setPastedText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ───────── NEW frontend-only UI state (does not touch analysis logic) ─────────
  const [isDark, setIsDark] = useState<boolean>(false);
  const [fontStep, setFontStep] = useState<number>(1); // index into FONT_SIZES
  const [dashboardOpen, setDashboardOpen] = useState<boolean>(false);
  const [journal, setJournal] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Apply dark mode + text size to the page root
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontStep]}px`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [fontStep]);

  // ───────── Logic (unchanged) ─────────
  const handleAnalyze = async () => {
    if (isLoading) return;

    const text = pastedText.trim();
    if (activeTab === "paste" && text.length === 0) {
      setError("Please paste some document text before analyzing.");
      return;
    }
    if (activeTab === "upload") {
      setError("Please paste your document text using the Paste Text tab. File upload analysis is coming soon.");
      return;
    }

    setError("");
    setIsLoading(true);
    setShowResults(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong during analysis.");
        setIsLoading(false);
        return;
      }

      setAnalysis(data);
      setShowResults(true);
      setIsLoading(false);
    } catch {
      setError("Could not reach the analysis service. Please try again.");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsLoading(false);
    setShowResults(false);
    setAnalysis(null);
    setError("");
    setPastedText("");
    setFileName("");
    setIsDragging(false);
    setActiveTab("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (file?: File | null) => {
    if (file) setFileName(file.name);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  // ───────── NEW: Listen to Results (native SpeechSynthesis) ─────────
  const handleListen = () => {
    if (!analysis || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `What is this document. ${analysis.whatIsIt}. Is it safe. ${analysis.isSafe}. What to do next. ${analysis.nextSteps}`
    );
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // ───────── NEW: Share hub helpers ─────────
  const buildShareText = () =>
    analysis
      ? `ClearShield Summary\n\nWhat is this: ${analysis.whatIsIt}\n\nIs it safe: ${analysis.isSafe}\n\nWhat to do next: ${analysis.nextSteps}${
          journal.trim() ? `\n\nMy notes for the doctor: ${journal.trim()}` : ""
        }`
      : "";

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ───────── Visual helpers ─────────
  const tabClass = (tab: Tab) =>
    `flex min-h-[64px] flex-1 items-center justify-center gap-3 rounded-2xl px-4 py-4 text-lg font-bold transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 sm:text-xl ${
      activeTab === tab
        ? "bg-teal-800 text-white shadow-lg shadow-teal-900/25 dark:bg-teal-500 dark:text-teal-950"
        : "bg-transparent text-slate-700 hover:bg-white hover:text-teal-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-200"
    }`;

  const isSafeText = analysis?.isSafe ?? "";
  const isAllClear = isSafeText.toLowerCase().startsWith("all clear");

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#f6f3ec] text-slate-900 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* Soft ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-900/40" />
        <div className="absolute -right-24 top-40 h-[22rem] w-[22rem] rounded-full bg-amber-100/70 blur-3xl dark:bg-amber-900/20" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[20rem] rounded-full bg-emerald-100/60 blur-3xl dark:bg-emerald-900/30" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        {/* Top bar */}
        <nav className="mb-10 flex items-center justify-between gap-3 sm:mb-14">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-800 shadow-lg shadow-teal-900/25 dark:bg-teal-500 sm:h-14 sm:w-14">
              <ShieldCheck className="h-7 w-7 text-white dark:text-teal-950 sm:h-8 sm:w-8" aria-hidden="true" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-teal-950 dark:text-teal-100 sm:text-3xl">
              ClearShield
            </span>
          </div>

          {/* NEW: Header tools — text size + dark mode */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-teal-900/10 bg-white/70 px-4 py-2 text-base font-semibold text-teal-900 backdrop-blur dark:border-teal-100/10 dark:bg-slate-900/70 dark:text-teal-200 lg:inline-flex">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Private &amp; Secure
            </span>

            <div
              className="flex items-center rounded-full border border-teal-900/10 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-teal-100/10 dark:bg-slate-900/80"
              role="group"
              aria-label="Text size"
            >
              <button
                type="button"
                onClick={() => setFontStep((s) => Math.max(0, s - 1))}
                disabled={fontStep === 0}
                aria-label="Make text smaller"
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-teal-900 transition hover:bg-teal-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 disabled:opacity-40 dark:text-teal-200 dark:hover:bg-slate-800"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontStep((s) => Math.min(FONT_SIZES.length - 1, s + 1))}
                disabled={fontStep === FONT_SIZES.length - 1}
                aria-label="Make text bigger"
                className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-extrabold text-teal-900 transition hover:bg-teal-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 disabled:opacity-40 dark:text-teal-200 dark:hover:bg-slate-800"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={isDark}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-900/10 bg-white/80 text-teal-900 shadow-sm backdrop-blur transition hover:bg-teal-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-teal-100/10 dark:bg-slate-900/80 dark:text-amber-300 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun className="h-6 w-6" aria-hidden="true" /> : <Moon className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {/* Hero */}
        {!showResults && (
          <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-900/5 px-4 py-2 text-base font-semibold text-teal-900 dark:bg-teal-100/10 dark:text-teal-200 sm:text-lg">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
              Your friendly health document helper
            </p>
            <h1 className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-teal-950 dark:text-teal-50 sm:text-5xl lg:text-6xl">
              Understand your health papers,{" "}
              <span className="italic text-teal-700 dark:text-teal-300">in plain words.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-xl leading-relaxed text-slate-700 dark:text-slate-300 sm:text-2xl">
              Medical reports, hospital bills and insurance policies — explained simply,
              so you know exactly what to do next.
            </p>
          </header>
        )}

        {/* Input Card */}
        {!showResults && (
          <main
            className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white bg-white/85 p-5 shadow-2xl shadow-teal-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/40 sm:p-8 lg:p-10"
            aria-busy={isLoading}
          >
            {/* Step label */}
            <p className="mb-4 text-lg font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              Step 1 · Add your document
            </p>

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Choose how to add your document"
              className="mb-6 flex flex-col gap-2 rounded-3xl bg-[#efeadf] p-2 dark:bg-slate-950 sm:flex-row"
            >
              <button
                type="button"
                role="tab"
                id="tab-upload"
                aria-selected={activeTab === "upload"}
                aria-controls="panel-upload"
                disabled={isLoading}
                onClick={() => setActiveTab("upload")}
                className={`${tabClass("upload")} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
                Upload Document
              </button>
              <button
                type="button"
                role="tab"
                id="tab-paste"
                aria-selected={activeTab === "paste"}
                aria-controls="panel-paste"
                disabled={isLoading}
                onClick={() => setActiveTab("paste")}
                className={`${tabClass("paste")} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <ClipboardPaste className="h-6 w-6" aria-hidden="true" />
                Paste Text
              </button>
            </div>

            {/* Upload Panel */}
            {activeTab === "upload" && (
              <div role="tabpanel" id="panel-upload" aria-labelledby="tab-upload">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={`flex flex-col items-center justify-center rounded-3xl border-[3px] border-dashed px-5 py-10 text-center transition-all duration-300 sm:px-8 sm:py-14 ${
                    isDragging
                      ? "scale-[1.01] border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950"
                      : "border-slate-300 bg-[#faf8f3] hover:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-400"
                  }`}
                >
                  {fileName ? (
                    <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border-2 border-teal-200 bg-white px-4 py-4 shadow-sm dark:border-teal-800 dark:bg-slate-900">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900">
                          <FileText className="h-7 w-7 text-teal-800 dark:text-teal-200" aria-hidden="true" />
                        </div>
                        <span className="truncate text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
                          {fileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFileName("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        disabled={isLoading}
                        aria-label="Remove selected file"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-red-950 dark:hover:text-red-300"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 ring-8 ring-teal-50 dark:bg-teal-900 dark:ring-teal-950">
                        <UploadCloud className="h-10 w-10 text-teal-800 dark:text-teal-200" aria-hidden="true" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                        Drop your document here
                      </p>
                      <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 sm:text-xl">
                        PDF, JPG or PNG &middot; a phone photo works too
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="mt-7 min-h-[60px] w-full rounded-2xl border-[3px] border-teal-800 bg-white px-8 py-4 text-xl font-bold text-teal-900 transition hover:bg-teal-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 disabled:opacity-50 dark:border-teal-400 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800 sm:w-auto"
                      >
                        Choose a File
                      </button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              </div>
            )}

            {/* Paste Panel */}
            {activeTab === "paste" && (
              <div role="tabpanel" id="panel-paste" aria-labelledby="tab-paste">
                <label
                  htmlFor="paste-input"
                  className="mb-3 block text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl"
                >
                  Paste the text of your document
                </label>
                <textarea
                  id="paste-input"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  disabled={isLoading}
                  rows={9}
                  placeholder="Paste your lab results, hospital bill or insurance policy text here..."
                  className="w-full resize-y rounded-2xl border-[3px] border-slate-300 bg-[#faf8f3] p-5 text-lg leading-relaxed text-slate-900 placeholder:text-slate-500 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-900 dark:focus:ring-teal-900 sm:text-xl"
                />
                <p className="mt-2 text-right text-base font-medium text-slate-600 dark:text-slate-400">
                  {pastedText.length.toLocaleString()} characters
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-lg font-medium text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Analyze Button */}
            <p className="mb-3 mt-8 text-lg font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              Step 2 · Get your answer
            </p>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="group flex min-h-[76px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 px-6 py-5 text-2xl font-extrabold text-white shadow-xl shadow-teal-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 disabled:cursor-not-allowed disabled:from-teal-500 disabled:to-teal-600 disabled:shadow-none dark:from-teal-500 dark:to-teal-700 dark:text-teal-950 sm:text-3xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                  <span>Reading your document…</span>
                </>
              ) : (
                <>
                  <ScanSearch className="h-8 w-8 transition-transform group-hover:scale-110" aria-hidden="true" />
                  <span>Explain My Document</span>
                </>
              )}
            </button>

            <p
              className="mt-5 flex items-center justify-center gap-2 text-center text-base text-slate-600 dark:text-slate-400 sm:text-lg"
              role="status"
              aria-live="polite"
            >
              <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
              {isLoading
                ? "Reading your document. This will only take a moment."
                : "Your document stays private and is never shared."}
            </p>
          </main>
        )}

        {/* Results Dashboard — animates in below the upload area */}
        {showResults && analysis && (
          <section
            aria-labelledby="results-heading"
            className="w-full animate-[cs-fade-up_0.6s_ease-out_both] print:animate-none"
          >
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-lg font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Done reading
                </p>
                <h2
                  id="results-heading"
                  className="font-serif text-4xl font-bold tracking-tight text-teal-950 dark:text-teal-50 sm:text-5xl"
                >
                  Your Results
                </h2>
                <p className="mt-2 text-xl text-slate-700 dark:text-slate-300 sm:text-2xl">
                  Here is what your document means, in plain language.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                {/* NEW: Listen to Results */}
                <button
                  type="button"
                  onClick={handleListen}
                  aria-pressed={isSpeaking}
                  className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl border-[3px] border-teal-800 bg-white px-7 py-4 text-xl font-bold text-teal-900 shadow-md transition hover:bg-teal-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-teal-400 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800 sm:w-auto print:hidden"
                >
                  {isSpeaking ? (
                    <VolumeX className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-6 w-6" aria-hidden="true" />
                  )}
                  {isSpeaking ? "Stop Listening" : "Listen to Results"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl border-[3px] border-teal-800 bg-white px-7 py-4 text-xl font-bold text-teal-900 shadow-md transition hover:bg-teal-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-teal-400 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800 sm:w-auto print:hidden"
                >
                  <RotateCcw className="h-6 w-6" aria-hidden="true" />
                  Check Another Document
                </button>
              </div>
            </div>

            {/* Results grid: stacked on phones, side-by-side on laptops */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 — What is it */}
              <article className="flex flex-col rounded-[1.75rem] border-2 border-sky-100 bg-white p-6 shadow-xl shadow-sky-900/5 dark:border-sky-900 dark:bg-slate-900 sm:p-8">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-700 shadow-md">
                    <FileText className="h-7 w-7 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-base font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">1</p>
                    <h3 className="text-2xl font-extrabold text-sky-950 dark:text-sky-100">What is this?</h3>
                  </div>
                </div>
                <p className="text-xl leading-relaxed text-slate-800 dark:text-slate-200">{analysis.whatIsIt}</p>
              </article>

              {/* Card 2 — Safety (green/orange) */}
              <article
                className={`flex flex-col rounded-[1.75rem] border-2 p-6 shadow-xl sm:p-8 ${
                  isAllClear
                    ? "border-emerald-200 bg-emerald-50 shadow-emerald-900/5 dark:border-emerald-800 dark:bg-emerald-950"
                    : "border-amber-300 bg-amber-50 shadow-amber-900/5 dark:border-amber-700 dark:bg-amber-950"
                }`}
              >
                <div className="mb-5 flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-md ${
                      isAllClear ? "bg-emerald-700" : "bg-amber-600"
                    }`}
                  >
                    {isAllClear ? (
                      <CheckCircle2 className="h-7 w-7 text-white" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-7 w-7 text-white" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-base font-bold uppercase tracking-wider ${
                        isAllClear ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400"
                      }`}
                    >
                      2
                    </p>
                    <h3
                      className={`text-2xl font-extrabold ${
                        isAllClear ? "text-emerald-950 dark:text-emerald-100" : "text-amber-950 dark:text-amber-100"
                      }`}
                    >
                      Is it safe?
                    </h3>
                  </div>
                </div>
                <p className="text-xl leading-relaxed text-slate-900 dark:text-slate-100">{analysis.isSafe}</p>
              </article>

              {/* Card 3 — Next steps */}
              <article className="flex flex-col rounded-[1.75rem] border-2 border-teal-800 bg-teal-900 p-6 text-white shadow-xl shadow-teal-900/25 dark:border-teal-500 dark:bg-teal-800 sm:p-8 md:col-span-2 lg:col-span-1">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md">
                    <ListChecks className="h-7 w-7 text-teal-900" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-base font-bold uppercase tracking-wider text-teal-200">3</p>
                    <h3 className="text-2xl font-extrabold text-white">What to do next</h3>
                  </div>
                </div>
                <p className="text-xl leading-relaxed text-teal-50">{analysis.nextSteps}</p>
              </article>
            </div>

            {/* NEW: Glowing button that opens the slide-up Action Dashboard */}
            <div className="mt-10 flex justify-center print:hidden">
              <button
                type="button"
                onClick={() => setDashboardOpen(true)}
                aria-haspopup="dialog"
                className="flex min-h-[76px] w-full max-w-xl items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-8 py-5 text-2xl font-extrabold text-amber-950 shadow-[0_0_40px_rgba(251,191,36,0.45)] ring-4 ring-amber-300/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_56px_rgba(251,191,36,0.6)] active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 sm:text-3xl"
              >
                <Share2 className="h-8 w-8" aria-hidden="true" />
                Prepare for Doctor &amp; Share
              </button>
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              ClearShield explains documents in simple terms. It does not replace advice
              from a qualified doctor or health worker.
            </p>
          </section>
        )}
      </div>

      {/* NEW: Slide-Up Action Dashboard (bottom sheet on phones, centered modal on laptops) */}
      {dashboardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-heading"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close dashboard"
            onClick={() => setDashboardOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-[cs-fade-in_0.25s_ease-out_both]"
          />

          <div className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/60 bg-white p-5 shadow-2xl animate-[cs-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both] dark:border-slate-700 dark:bg-slate-900 sm:rounded-[2rem] sm:p-8">
            {/* Grab handle (mobile affordance) */}
            <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="dashboard-heading"
                  className="font-serif text-3xl font-bold tracking-tight text-teal-950 dark:text-teal-50 sm:text-4xl"
                >
                  Prepare &amp; Share
                </h2>
                <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">
                  Everything you need for your doctor visit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDashboardOpen(false)}
                aria-label="Close"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* My Health Journal */}
            <div className="mb-6">
              <label
                htmlFor="health-journal"
                className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <NotebookPen className="h-6 w-6 text-teal-800 dark:text-teal-300" aria-hidden="true" />
                My Health Journal
              </label>
              <textarea
                id="health-journal"
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                rows={4}
                placeholder="How are you feeling? Type questions for your doctor here..."
                className="w-full resize-y rounded-2xl border-[3px] border-slate-300 bg-[#faf8f3] p-5 text-lg leading-relaxed text-slate-900 placeholder:text-slate-500 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:bg-slate-900 sm:text-xl"
              />
            </div>

            {/* Smart Share Hub */}
            <p className="mb-3 text-lg font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              Smart Share Hub
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handlePrint}
                className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl border-[3px] border-teal-800 bg-white px-4 py-3 text-lg font-bold text-teal-900 transition hover:bg-teal-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-teal-400 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800"
              >
                <Printer className="h-6 w-6" aria-hidden="true" />
                Save as PDF
              </button>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-95 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
              >
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex min-h-[64px] items-center justify-center gap-2 rounded-2xl border-[3px] px-4 py-3 text-lg font-bold transition active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 ${
                  copied
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-teal-800 bg-white text-teal-900 hover:bg-teal-50 dark:border-teal-400 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800"
                }`}
                aria-live="polite"
              >
                {copied ? (
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Copy className="h-6 w-6" aria-hidden="true" />
                )}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>

            {/* Emergency / Action */}
            <a
              href="https://www.google.com/maps/search/clinics+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-[68px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 px-6 py-4 text-xl font-extrabold text-white shadow-lg shadow-red-900/30 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
            >
              <MapPin className="h-7 w-7" aria-hidden="true" />
              Find Nearby Clinic
            </a>
          </div>
        </div>
      )}

      {/* Keyframes + print styles (frontend only) */}
      <style jsx global>{`
        @keyframes cs-fade-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes cs-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes cs-slide-up {
          from {
            opacity: 0;
            transform: translateY(48px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media print {
          nav,
          button,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}