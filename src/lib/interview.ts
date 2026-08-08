import { v4 as uuidv4 } from "uuid";
import { Candidate } from "./data";
import { buildInterviewProfile, InterviewProfile } from "./personalization";
import { generateInterviewReply } from "./llm";

export type Message = {
  role: "interviewer" | "candidate";
  content: string;
  why?: string;
};

export type Session = {
  id: string;
  candidate: Candidate;
  profile: InterviewProfile;
  messages: Message[];
  coveredDays: Set<number>;
  questionCount: number;
  done: boolean;
  feedback?: {
    summary: string;
    strengths: string[];
    gaps: string[];
    next: string[];
  };
};

const sessions = new Map<string, Session>();
const MIN_QUESTIONS = 8;
const MIN_DAYS = 4;

export function startSession(candidate: Candidate, sessionId?: string): Session {
  const id = sessionId || uuidv4();
  const profile = buildInterviewProfile(candidate);
  const session: Session = {
    id,
    candidate,
    profile,
    messages: [],
    coveredDays: new Set(),
    questionCount: 0,
    done: false,
  };
  sessions.set(id, session);
  return session;
}

export async function processTurn(
  sessionId: string,
  message?: string
): Promise<{
  reply: string;
  why?: string;
  done: boolean;
  feedback?: Session["feedback"];
  profile?: InterviewProfile;
  coveredDays?: number[];
  questionCount?: number;
}> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  if (session.done) {
    return {
      reply: "Interview already completed.",
      done: true,
      feedback: session.feedback,
    };
  }

  if (message) {
    session.messages.push({ role: "candidate", content: message });
  }

  const shouldForceEnd =
    session.questionCount >= 12 ||
    (session.questionCount >= MIN_QUESTIONS && session.coveredDays.size >= MIN_DAYS);

  const llmResult = await generateInterviewReply({
    candidate: session.candidate,
    profile: session.profile,
    history: session.messages,
    questionCount: session.questionCount,
    coveredDays: Array.from(session.coveredDays),
    isFinal: shouldForceEnd,
  });

  // Simple heuristic to track covered days from the reply (LLM often mentions Day X)
  const dayMatches = llmResult.reply.match(/Day\s+(\d+)/gi) || [];
  dayMatches.forEach((m) => {
    const num = parseInt(m.replace(/\D/g, ""));
    if (num >= 1 && num <= 31) session.coveredDays.add(num);
  });

  if (!shouldForceEnd) {
    session.questionCount += 1;
  }

  session.messages.push({
    role: "interviewer",
    content: llmResult.reply,
    why: llmResult.why,
  });

  if (shouldForceEnd || llmResult.shouldEnd) {
    session.done = true;
    session.feedback = generateFeedback(session);
    return {
      reply: llmResult.reply,
      why: llmResult.why,
      done: true,
      feedback: session.feedback,
      profile: session.profile,
      coveredDays: Array.from(session.coveredDays),
      questionCount: session.questionCount,
    };
  }

  return {
    reply: llmResult.reply,
    why: llmResult.why,
    done: false,
    profile: session.profile,
    coveredDays: Array.from(session.coveredDays),
    questionCount: session.questionCount,
  };
}

function generateFeedback(session: Session): Session["feedback"] {
  const { profile, coveredDays, candidate } = session;
  const covered = Array.from(coveredDays).sort((a, b) => a - b);

  const strengths: string[] = [];
  profile.strengths
    .filter((s) => covered.includes(s.day))
    .forEach((s) => strengths.push(`Strong first-try mastery of Day ${s.day} (${s.title})`));
  if (strengths.length === 0) {
    strengths.push("Clear communication and structured thinking on core topics");
  }

  const gaps: string[] = [];
  profile.gaps.forEach((g) =>
    gaps.push(`Day ${g.day} (${g.title}) was skipped — focused review recommended`)
  );
  profile.struggles
    .filter((s) => covered.includes(s.day))
    .forEach((s) =>
      gaps.push(`Day ${s.day} required multiple attempts — deepen practical debugging`)
    );

  const next: string[] = [];
  const role = candidate.member.jobRole.toLowerCase();
  if (role.includes("devops")) {
    next.push("Practice end-to-end deployment + observability of a RAG service (Days 24–28)");
  } else if (role.includes("ai engineer")) {
    next.push("Build a multi-agent system with MCP tools and a proper evaluation harness");
  } else {
    next.push("Write a short design doc for a production RAG pipeline and revisit any skipped modules");
  }
  next.push("Schedule a system-design mock focused on LLM application architecture");
  next.push("Contribute a small improvement to evaluation or monitoring tooling");

  const summary = `${candidate.member.name} showed solid command of the topics covered (Days ${covered.join(
    ", "
  )}). Role alignment with ${candidate.member.jobRole} and engagement signals shaped the difficulty and focus of this interview.`;

  return { summary, strengths, gaps, next };
}
