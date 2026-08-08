
    "use client";

import { useState, useRef, useEffect } from "react";
import { CANDIDATES, Candidate } from "@/lib/data";
import { InterviewProfile } from "@/lib/personalization";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  User,
  Info,
  Download,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type ChatMessage = {
  role: "interviewer" | "candidate";
  content: string;
  why?: string;
};

export default function Home() {
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [profile, setProfile] = useState<InterviewProfile | null>(null);
  const [coveredDays, setCoveredDays] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [showPrep, setShowPrep] = useState(true);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingText]);

  // Simple client-side streaming simulation for polish
  async function streamText(full: string, onDone: () => void) {
    setStreamingText("");
    const words = full.split(" ");
    for (let i = 0; i < words.length; i++) {
      setStreamingText((prev) => prev + (i === 0 ? "" : " ") + words[i]);
      await new Promise((r) => setTimeout(r, 18 + Math.random() * 25));
    }
    onDone();
  }

  async function startInterview(candidate: Candidate) {
    setSelected(candidate);
    setLoading(true);
    setMessages([]);
    setDone(false);
    setFeedback(null);
    setStreamingText("");

    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate, sessionId: crypto.randomUUID() }),
    });
    const data = await res.json();

    setSessionId(data.sessionId);
    setProfile(data.profile);
    setCoveredDays(data.coveredDays || []);
    setQuestionCount(data.questionCount || 1);

    await streamText(data.reply, () => {
      setMessages([{ role: "interviewer", content: data.reply, why: data.why }]);
      setStreamingText("");
      setLoading(false);
    });
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId || loading || done) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "candidate", content: userMsg }]);
    setLoading(true);
    setStreamingText("");

    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: userMsg }),
    });
    const data = await res.json();

    setProfile(data.profile || profile);
    setCoveredDays(data.coveredDays || coveredDays);
    setQuestionCount(data.questionCount || questionCount);

    await streamText(data.reply, () => {
      setMessages((m) => [
        ...m,
        { role: "interviewer", content: data.reply, why: data.why },
      ]);
      setStreamingText("");
      setLoading(false);

      if (data.done) {
        setDone(true);
        setFeedback(data.feedback);
      }
    });
  }

  async function downloadPDF() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save(`${selected?.member.name.replace(" ", "_")}_Interview_Report.pdf`);
  }

  // Radar data
  const radarData = profile
    ? [
        { subject: "Embeddings", A: coveredDays.some((d) => d >= 7 && d <= 10) ? 90 : 30, fullMark: 100 },
        { subject: "RAG", A: coveredDays.some((d) => d >= 11 && d <= 14) ? 85 : 25, fullMark: 100 },
        { subject: "Agents", A: coveredDays.some((d) => d >= 15 && d <= 20) ? 80 : 20, fullMark: 100 },
        { subject: "Eval & Obs", A: coveredDays.some((d) => d >= 21 && d <= 24) ? 75 : 30, fullMark: 100 },
        { subject: "Deploy", A: coveredDays.some((d) => d >= 25 && d <= 28) ? 70 : 25, fullMark: 100 },
        { subject: "Role Fit", A: 80, fullMark: 100 },
      ]
    : [];

  // ========== START SCREEN ==========
  if (!selected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-950">
        <div className="max-w-4xl w-full">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-400 mb-4">
              <Sparkles size={14} /> Full Winning Package
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Cohort Interviewer
            </h1>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              AI-powered technical interview agent that actually reads each graduate’s real learning history, role, and struggle signals.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {CANDIDATES.map((c) => (
              <button
                key={c.member.id}
                onClick={() => startInterview(c)}
                className="group text-left rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 group-hover:bg-indigo-600/20">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-white text-lg">{c.member.name}</div>
                    <div className="text-sm text-zinc-400">{c.member.jobRole}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{c.member.yearsExperience}y exp</span>
                  <span>·</span>
                  <span>{c.signals.missionsCompleted} missions</span>
                  <span>·</span>
                  <span>{c.signals.missionsFirstTry} first-try</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== FEEDBACK REPORT ==========
  if (done && feedback) {
    return (
      <div className="min-h-screen p-6 md:p-10 bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-white">Interview Report</h1>
              <p className="text-zinc-400 mt-1">
                {selected.member.name} · {selected.member.jobRole}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={() => {
                  setSelected(null);
                  setSessionId(null);
                  setMessages([]);
                  setDone(false);
                  setFeedback(null);
                }}
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                New interview
              </button>
            </div>
          </div>

          <div ref={reportRef} className="space-y-6 bg-zinc-950 p-2">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
                Summary
              </h2>
              <p className="mt-3 text-zinc-200 leading-relaxed text-lg">{feedback.summary}</p>
            </section>

            <div className="grid gap-6 md:grid-cols-3">
              <section className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wider text-emerald-500/90">
                  Strengths
                </h2>
                <ul className="mt-4 space-y-3">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-200">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wider text-amber-500/90">
                  Gaps
                </h2>
                <ul className="mt-4 space-y-3">
                  {feedback.gaps.map((g: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-200">{g}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-blue-900/40 bg-blue-950/20 p-6">
                <h2 className="text-sm font-medium uppercase tracking-wider text-blue-500/90">
                  Recommended Next
                </h2>
                <ul className="mt-4 space-y-3">
                  {feedback.next.map((n: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-200">{n}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN INTERVIEW UI ==========
  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-indigo-400" />
          <div>
            <div className="font-medium text-white">Cohort Interviewer</div>
            <div className="text-xs text-zinc-500">
              {selected.member.name} · {selected.member.jobRole}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <span className="hidden sm:inline">
            Q{questionCount} · Days: {coveredDays.sort((a, b) => a - b).join(", ") || "—"}
          </span>
          <button
            onClick={() => {
              setSelected(null);
              setSessionId(null);
            }}
            className="text-zinc-500 hover:text-zinc-300"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel – Prep notes + Radar */}
        <aside
          className={clsx(
            "border-r border-zinc-800 bg-zinc-900/40 transition-all flex flex-col",
            showPrep ? "w-80" : "w-12"
          )}
        >
          <button
            onClick={() => setShowPrep(!showPrep)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-800/50"
          >
            {showPrep ? (
              <>
                <span className="font-medium">Interviewer’s Brain</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <ChevronDown size={16} className="mx-auto" />
            )}
          </button>

          {showPrep && profile && (
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
              <div className="space-y-3 text-xs leading-relaxed text-zinc-400">
                {profile.prepNotes.map((note, i) => (
                  <p key={i} className="border-l-2 border-indigo-500/40 pl-3">
                    {note}
                  </p>
                ))}
              </div>

              {/* Live Radar */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
                  Live Coverage Radar
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar
                        name="Coverage"
                        dataKey="A"
                        stroke="#818cf8"
                        fill="#818cf8"
                        fillOpacity={0.35}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Chat */}
        <main className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={clsx("flex", m.role === "candidate" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={clsx(
                      "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "interviewer"
                        ? "bg-zinc-800/90 text-zinc-100"
                        : "bg-indigo-600 text-white"
                    )}
                  >
                    {m.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>
                        {line}
                      </p>
                    ))}

                    {/* Why this question tooltip */}
                    {m.role === "interviewer" && m.why && (
                      <div className="group absolute -right-2 -top-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-zinc-300 cursor-help">
                          <Info size={12} />
                        </div>
                        <div className="absolute right-0 top-8 z-20 hidden w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-300 shadow-xl group-hover:block">
                          <div className="font-medium text-indigo-400 mb-1">Why this question?</div>
                          {m.why}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming text */}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl bg-zinc-800/90 px-4 py-3 text-sm text-zinc-100">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse" />
                  </div>
                </div>
              )}

              {loading && !streamingText && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-800/90 px-4 py-3 text-sm text-zinc-400">
                    <Loader2 size={16} className="animate-spin" />
                    Interviewer is thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 p-4">
            <div className="mx-auto flex max-w-2xl gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type your answer… (or say “I don’t know”)"
                disabled={loading || done}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={loading || done || !input.trim()}
                className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition"
              >
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
