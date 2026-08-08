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
  Info,
  Download,
  Copy,
  Sun,
  Moon,
  Check,
  Sparkles,
  ArrowRight,
  Plus,
  X,
  UserPlus,
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
  const [darkMode, setDarkMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [customCandidates, setCustomCandidates] = useState<Candidate[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for new candidate
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("AI Engineer");
  const [newExp, setNewExp] = useState(3);
  const [newEducation, setNewEducation] = useState("BS Computer Science");

  const bottomRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const allCandidates = [...CANDIDATES, ...customCandidates];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingText]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  async function streamText(full: string, onDone: () => void) {
    setStreamingText("");
    const words = full.split(" ");
    for (let i = 0; i < words.length; i++) {
      setStreamingText((prev) => prev + (i === 0 ? "" : " ") + words[i]);
      await new Promise((r) => setTimeout(r, 14 + Math.random() * 18));
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
      setMessages((m) => [...m, { role: "interviewer", content: data.reply, why: data.why }]);
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

  function copyTranscript() {
    const text = messages
      .map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAddCandidate() {
    if (!newName.trim()) return;

    const newCandidate: Candidate = {
      member: {
        id: `CUSTOM-${Date.now()}`,
        name: newName.trim(),
        jobRole: newRole,
        yearsExperience: newExp,
        education: newEducation,
        status: "COMPLETED",
      },
      missions: [
        { day: 7, title: "Embeddings Explained", passed: true, attempts: 1 },
        { day: 11, title: "RAG End-to-End & LLM API Basics", passed: true, attempts: 2 },
        { day: 15, title: "Agent Fundamentals", passed: true, attempts: 3 },
        { day: 24, title: "Monitoring, Logging & Observability", passed: true, attempts: 1 },
        { day: 19, title: "MCP & External Tool Protocols", skipped: true },
      ],
      signals: {
        commitDays: 25,
        missionsCompleted: 27,
        missionsFirstTry: 14,
      },
    };

    setCustomCandidates((prev) => [...prev, newCandidate]);
    setShowAddModal(false);
    setNewName("");
    setNewRole("AI Engineer");
    setNewExp(3);
    setNewEducation("BS Computer Science");
  }

  const radarData = profile
    ? [
        { subject: "Embeddings", A: coveredDays.some((d) => d >= 7 && d <= 10) ? 90 : 30, fullMark: 100 },
        { subject: "RAG", A: coveredDays.some((d) => d >= 11 && d <= 14) ? 85 : 25, fullMark: 100 },
        { subject: "Agents", A: coveredDays.some((d) => d >= 15 && d <= 20) ? 80 : 20, fullMark: 100 },
        { subject: "Eval", A: coveredDays.some((d) => d >= 21 && d <= 24) ? 75 : 30, fullMark: 100 },
        { subject: "Deploy", A: coveredDays.some((d) => d >= 25 && d <= 28) ? 70 : 25, fullMark: 100 },
        { subject: "Role Fit", A: 85, fullMark: 100 },
      ]
    : [];

  const progressPercent = Math.min((questionCount / 10) * 100, 100);

  // ====================== START SCREEN ======================
  if (!selected) {
    return (
      <div className={clsx("min-h-screen flex flex-col transition-colors duration-300", darkMode ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900")}>
        {/* Navbar */}
        <header className={clsx("flex items-center justify-between px-6 lg:px-10 py-5 border-b backdrop-blur-xl sticky top-0 z-50", darkMode ? "border-zinc-800/80 bg-zinc-950/80" : "border-zinc-200 bg-white/80")}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
              <MessageSquare size={18} className="text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Cohort Interviewer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 transition shadow-lg shadow-indigo-600/20"
            >
              <UserPlus size={16} />
              Add Candidate
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={clsx("p-2 rounded-lg transition", darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500")}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 lg:py-24">
          <div className="max-w-3xl w-full text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-400 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              AI Technical Interview Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Interview candidates based on their
              <span className="block mt-2 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                real learning history
              </span>
            </h1>

            <p className={clsx("mt-6 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed", darkMode ? "text-zinc-400" : "text-zinc-600")}>
              A smart interviewer that analyzes strengths, struggles, skipped topics and job role — then runs a realistic multi-turn technical interview.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {["Personalized Questions", "Live Skill Radar", "Smart Follow-ups", "PDF Reports", "Add Custom Candidates"].map((item) => (
                <span
                  key={item}
                  className={clsx(
                    "rounded-full px-4 py-1.5 text-sm border backdrop-blur-sm",
                    darkMode ? "border-zinc-700/80 bg-zinc-900/60 text-zinc-300" : "border-zinc-200 bg-white/80 text-zinc-600"
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Candidates Grid */}
          <div className="mt-20 w-full max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <p className={clsx("text-sm font-medium uppercase tracking-widest", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                Select a candidate
              </p>
              <span className={clsx("text-sm", darkMode ? "text-zinc-600" : "text-zinc-400")}>
                {allCandidates.length} available
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {allCandidates.map((c) => (
                <button
                  key={c.member.id}
                  onClick={() => startInterview(c)}
                  className={clsx(
                    "group relative text-left rounded-2xl border p-6 transition-all duration-300",
                    darkMode
                      ? "border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/40 hover:bg-zinc-900 hover:shadow-xl hover:shadow-indigo-500/5"
                      : "border-zinc-200 bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold transition-all duration-300",
                      darkMode
                        ? "bg-zinc-800 text-zinc-200 group-hover:bg-indigo-600/20 group-hover:text-indigo-400"
                        : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                    )}>
                      {c.member.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{c.member.name}</div>
                      <div className={clsx("text-sm", darkMode ? "text-zinc-400" : "text-zinc-500")}>
                        {c.member.jobRole}
                      </div>
                    </div>
                  </div>

                  <div className={clsx("mt-5 flex flex-wrap gap-3 text-xs", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                    <span>{c.member.yearsExperience}y experience</span>
                    <span>•</span>
                    <span>{c.signals.missionsCompleted} missions</span>
                    <span>•</span>
                    <span>{c.signals.missionsFirstTry} first-try</span>
                  </div>

                  <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    Start Interview <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className={clsx("py-6 text-center text-sm border-t", darkMode ? "border-zinc-800/60 text-zinc-600" : "border-zinc-200 text-zinc-400")}>
          Built for realism, personalization & polish · Made by{" "}
          <span className="text-indigo-500 font-medium">Team Voids</span>
        </footer>

        {/* ==================== ADD CANDIDATE MODAL ==================== */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <div className={clsx(
              "relative w-full max-w-md rounded-2xl border p-6 shadow-2xl",
              darkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200"
            )}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserPlus size={20} className="text-indigo-500" />
                  Add New Candidate
                </h2>
                <button onClick={() => setShowAddModal(false)} className={clsx("p-1.5 rounded-lg", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={clsx("block text-sm mb-1.5", darkMode ? "text-zinc-400" : "text-zinc-600")}>Full Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Alex Kumar"
                    className={clsx(
                      "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                      darkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-300"
                    )}
                  />
                </div>

                <div>
                  <label className={clsx("block text-sm mb-1.5", darkMode ? "text-zinc-400" : "text-zinc-600")}>Job Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className={clsx(
                      "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                      darkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-300"
                    )}
                  >
                    <option>AI Engineer</option>
                    <option>Senior Data Engineer</option>
                    <option>DevOps Engineer</option>
                    <option>Business Analyst</option>
                    <option>Machine Learning Engineer</option>
                    <option>Full Stack Developer</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={clsx("block text-sm mb-1.5", darkMode ? "text-zinc-400" : "text-zinc-600")}>Years of Experience</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={newExp}
                      onChange={(e) => setNewExp(Number(e.target.value))}
                      className={clsx(
                        "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                        darkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-300"
                      )}
                    />
                  </div>
                  <div>
                    <label className={clsx("block text-sm mb-1.5", darkMode ? "text-zinc-400" : "text-zinc-600")}>Education</label>
                    <input
                      value={newEducation}
                      onChange={(e) => setNewEducation(e.target.value)}
                      placeholder="BS Computer Science"
                      className={clsx(
                        "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                        darkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-300"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className={clsx("flex-1 rounded-xl border py-2.5 text-sm transition", darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCandidate}
                  disabled={!newName.trim()}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 transition"
                >
                  Add Candidate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====================== FEEDBACK + MAIN UI (same as previous advanced version) ======================
  // (Keeping the rest of the code the same for feedback & interview screens)

  if (done && feedback) {
    return (
      <div className={clsx("min-h-screen p-6 md:p-12 transition-colors", darkMode ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900")}>
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Interview Report</h1>
              <p className={clsx("mt-1", darkMode ? "text-zinc-400" : "text-zinc-500")}>
                {selected.member.name} · {selected.member.jobRole}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={downloadPDF} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">
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
                className={clsx("rounded-xl border px-5 py-2.5 text-sm transition", darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100")}
              >
                New Interview
              </button>
            </div>
          </div>

          <div ref={reportRef} className="space-y-6">
            <section className={clsx("rounded-2xl border p-8", darkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-white shadow-sm")}>
              <h2 className={clsx("text-xs font-semibold uppercase tracking-widest", darkMode ? "text-zinc-500" : "text-zinc-400")}>Summary</h2>
              <p className="mt-4 text-lg leading-relaxed">{feedback.summary}</p>
            </section>

            <div className="grid gap-6 md:grid-cols-3">
              <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Strengths</h2>
                <ul className="mt-4 space-y-3">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500">Gaps</h2>
                <ul className="mt-4 space-y-3">
                  {feedback.gaps.map((g: string, i: number) => (
                    <li key={i} className="text-sm leading-relaxed">{g}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500">Next Steps</h2>
                <ul className="mt-4 space-y-3">
                  {feedback.next.map((n: string, i: number) => (
                    <li key={i} className="text-sm leading-relaxed">{n}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <div className={clsx("mt-12 text-center text-sm", darkMode ? "text-zinc-600" : "text-zinc-400")}>
            Made by <span className="text-indigo-500 font-medium">Team Voids</span>
          </div>
        </div>
      </div>
    );
  }

  // Main Interview UI
  return (
    <div className={clsx("flex h-screen flex-col transition-colors duration-300", darkMode ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900")}>
      <header className={clsx("flex items-center justify-between px-5 py-3.5 border-b backdrop-blur-md", darkMode ? "border-zinc-800/80 bg-zinc-950/80" : "border-zinc-200 bg-white/80")}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <MessageSquare size={15} className="text-white" />
          </div>
          <div>
            <div className="font-medium text-sm">Cohort Interviewer</div>
            <div className={clsx("text-xs", darkMode ? "text-zinc-500" : "text-zinc-400")}>
              {selected.member.name} · {selected.member.jobRole}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-3 mr-2">
            <div className="w-28 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className={clsx("text-xs tabular-nums", darkMode ? "text-zinc-500" : "text-zinc-400")}>Q{questionCount}</span>
          </div>

          <button onClick={copyTranscript} className={clsx("p-2 rounded-lg transition", darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500")}>
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>

          <button onClick={() => setDarkMode(!darkMode)} className={clsx("p-2 rounded-lg transition", darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500")}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={() => { setSelected(null); setSessionId(null); }} className={clsx("text-xs px-3 py-1.5 rounded-lg transition", darkMode ? "text-zinc-500 hover:bg-zinc-800" : "text-zinc-400 hover:bg-zinc-200")}>
            Exit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={clsx("border-r flex flex-col transition-all duration-300", showPrep ? "w-80" : "w-12", darkMode ? "border-zinc-800/80 bg-zinc-900/30" : "border-zinc-200 bg-white")}>
          <button onClick={() => setShowPrep(!showPrep)} className={clsx("flex items-center justify-between px-4 py-3.5 text-sm", darkMode ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-100")}>
            {showPrep ? (
              <>
                <span className="font-medium flex items-center gap-2"><Sparkles size={14} className="text-indigo-500" /> Interviewer Brain</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <ChevronDown size={16} className="mx-auto" />
            )}
          </button>

          {showPrep && profile && (
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
              <div className={clsx("space-y-3 text-xs leading-relaxed", darkMode ? "text-zinc-400" : "text-zinc-500")}>
                {profile.prepNotes.map((note, i) => (
                  <p key={i} className="border-l-2 border-indigo-500/40 pl-3 py-0.5">{note}</p>
                ))}
              </div>

              <div>
                <h3 className={clsx("text-xs font-semibold uppercase tracking-wider mb-3", darkMode ? "text-zinc-500" : "text-zinc-400")}>Coverage Radar</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={darkMode ? "#27272a" : "#e4e4e7"} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: darkMode ? "#a1a1aa" : "#71717a", fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar name="Coverage" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
            <div className="mx-auto max-w-2xl space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={clsx("flex gap-3", m.role === "candidate" ? "flex-row-reverse" : "")}>
                  <div className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    m.role === "interviewer" ? "bg-indigo-600 text-white" : darkMode ? "bg-zinc-700 text-zinc-200" : "bg-zinc-200 text-zinc-700"
                  )}>
                    {m.role === "interviewer" ? "AI" : selected.member.name.split(" ").map(n => n[0]).join("")}
                  </div>

                  <div className={clsx("relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "interviewer"
                      ? darkMode ? "bg-zinc-800/90 text-zinc-100 rounded-tl-sm" : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm"
                      : "bg-indigo-600 text-white rounded-tr-sm"
                  )}>
                    {m.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                    ))}

                    {m.role === "interviewer" && m.why && (
                      <div className="group absolute -right-2 -top-2">
                        <div className={clsx("flex h-5 w-5 items-center justify-center rounded-full cursor-help", darkMode ? "bg-zinc-700 text-zinc-300" : "bg-zinc-100 text-zinc-500")}>
                          <Info size={11} />
                        </div>
                        <div className={clsx("absolute right-0 top-7 z-30 hidden w-60 rounded-xl border p-3 text-xs shadow-xl group-hover:block", darkMode ? "border-zinc-700 bg-zinc-900 text-zinc-300" : "border-zinc-200 bg-white text-zinc-600")}>
                          <div className="font-medium text-indigo-500 mb-1">Why this question?</div>
                          {m.why}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">AI</div>
                  <div className={clsx("max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm", darkMode ? "bg-zinc-800/90 text-zinc-100" : "bg-white border border-zinc-200")}>
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
                  </div>
                </div>
              )}

              {loading && !streamingText && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">AI</div>
                  <div className={clsx("flex items-center gap-2 rounded-2xl rounded-tl-sm px-4 py-3 text-sm", darkMode ? "bg-zinc-800/90 text-zinc-400" : "bg-white border border-zinc-200 text-zinc-500")}>
                    <Loader2 size={15} className="animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className={clsx("border-t p-4 md:p-5", darkMode ? "border-zinc-800/80 bg-zinc-950/50" : "border-zinc-200 bg-white/50")}>
            <div className="mx-auto max-w-2xl">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type your answer..."
                  disabled={loading || done}
                  className={clsx(
                    "flex-1 rounded-xl border px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition",
                    darkMode ? "border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500" : "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
                  )}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || done || !input.trim()}
                  className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition shadow-lg shadow-indigo-600/20"
                >
                  Send
                </button>
              </div>
              <div className={clsx("mt-2.5 text-center text-xs", darkMode ? "text-zinc-600" : "text-zinc-400")}>
                Made by Team Voids
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
