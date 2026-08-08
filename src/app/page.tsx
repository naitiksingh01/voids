"use client";

import { useState, useRef, useEffect } from "react";
import { CANDIDATES, Candidate } from "@/lib/data";
import { InterviewProfile } from "@/lib/personalization";
import { MessageSquare, ChevronDown, ChevronUp, Loader2, CheckCircle2, User } from "lucide-react";
import clsx from "clsx";

type ChatMessage = { role: "interviewer" | "candidate"; content: string };

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function startInterview(candidate: Candidate) {
    setSelected(candidate);
    setLoading(true);
    setMessages([]);
    setDone(false);
    setFeedback(null);

    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate, sessionId: crypto.randomUUID() }),
    });
    const data = await res.json();
    setSessionId(data.sessionId);
    setMessages([{ role: "interviewer", content: data.reply }]);
    setProfile(data.profile);
    setCoveredDays(data.coveredDays || []);
    setQuestionCount(data.questionCount || 1);
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId || loading || done) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "candidate", content: userMsg }]);
    setLoading(true);

    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: userMsg }),
    });
    const data = await res.json();

    setMessages((m) => [...m, { role: "interviewer", content: data.reply }]);
    setProfile(data.profile || profile);
    setCoveredDays(data.coveredDays || coveredDays);
    setQuestionCount(data.questionCount || questionCount);
    setLoading(false);

    if (data.done) {
      setDone(true);
      setFeedback(data.feedback);
    }
  }

  if (!selected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Cohort Interviewer</h1>
            <p className="mt-2 text-zinc-400">
              AI-powered technical interview agent · personalized to each graduate’s real learning history
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {CANDIDATES.map((c) => (
              <button
                key={c.member.id}
                onClick={() => startInterview(c)}
                className="group text-left rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 hover:bg-zinc-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-white">{c.member.name}</div>
                    <div className="text-sm text-zinc-400">{c.member.jobRole}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-3 text-xs text-zinc-500">
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

  if (done && feedback) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Interview Report</h1>
              <p className="text-zinc-400">
                {selected.member.name} · {selected.member.jobRole}
              </p>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setSessionId(null);
                setMessages([]);
                setDone(false);
                setFeedback(null);
              }}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              New interview
            </button>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Summary</h2>
              <p className="mt-2 text-zinc-200 leading-relaxed">{feedback.summary}</p>
            </section>

            <div className="grid gap-6 md:grid-cols-3">
              <section className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
                <h2 className="text-sm font-medium uppercase tracking-wider text-emerald-500/80">
                  Strengths
                </h2>
                <ul className="mt-3 space-y-2">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-200">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
                <h2 className="text-sm font-medium uppercase tracking-wider text-amber-500/80">Gaps</h2>
                <ul className="mt-3 space-y-2">
                  {feedback.gaps.map((g: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-200">
                      {g}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-5">
                <h2 className="text-sm font-medium uppercase tracking-wider text-blue-500/80">
                  Recommended next
                </h2>
                <ul className="mt-3 space-y-2">
                  {feedback.next.map((n: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-200">
                      {n}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-zinc-400" />
          <div>
            <div className="font-medium text-white">Cohort Interviewer</div>
            <div className="text-xs text-zinc-500">
              {selected.member.name} · {selected.member.jobRole}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>
            Q{questionCount} · Days covered:{" "}
            {coveredDays.sort((a, b) => a - b).join(", ") || "—"}
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
        <aside
          className={clsx(
            "border-r border-zinc-800 bg-zinc-900/30 transition-all",
            showPrep ? "w-80" : "w-12"
          )}
        >
          <button
            onClick={() => setShowPrep(!showPrep)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-800/50"
          >
            {showPrep ? (
              <>
                <span className="font-medium">Interviewer’s prep notes</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <ChevronDown size={16} className="mx-auto" />
            )}
          </button>
          {showPrep && profile && (
            <div className="space-y-3 px-4 pb-4 text-xs leading-relaxed text-zinc-400">
              {profile.prepNotes.map((note, i) => (
                <p key={i} className="border-l-2 border-zinc-700 pl-3">
                  {note}
                </p>
              ))}
            </div>
          )}
        </aside>

        <main className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex",
                    m.role === "candidate" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "interviewer"
                        ? "bg-zinc-800/80 text-zinc-100"
                        : "bg-indigo-600 text-white"
                    )}
                  >
                    {m.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-800/80 px-4 py-3 text-sm text-zinc-400">
                    <Loader2 size={16} className="animate-spin" />
                    Interviewer is thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-zinc-800 p-4">
            <div className="mx-auto flex max-w-2xl gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type your answer…"
                disabled={loading || done}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={loading || done || !input.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
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
