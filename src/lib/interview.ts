import { v4 as uuidv4 } from "uuid";
import { Candidate } from "./data";
import { buildInterviewProfile, getDay, InterviewProfile } from "./personalization";

export type Message = { role: "interviewer" | "candidate"; content: string };

export type Session = {
  id: string;
  candidate: Candidate;
  profile: InterviewProfile;
  messages: Message[];
  coveredDays: Set<number>;
  questionCount: number;
  currentFocusDay: number | null;
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
    currentFocusDay: null,
    done: false,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

function pickNextDay(session: Session): number {
  const remaining = session.profile.priorityDays.filter((d) => !session.coveredDays.has(d));
  if (remaining.length === 0) {
    return session.profile.priorityDays[0] || 11;
  }
  return remaining[0];
}

function generateReply(session: Session, candidateMessage?: string): string {
  const { profile, candidate } = session;
  const name = candidate.member.name.split(" ")[0];

  if (session.questionCount === 0) {
    const firstDay = pickNextDay(session);
    session.currentFocusDay = firstDay;
    const dayInfo = getDay(firstDay)!;
    session.coveredDays.add(firstDay);
    session.questionCount = 1;

    const isStruggle = profile.struggles.some((s) => s.day === firstDay);
    const isStrength = profile.strengths.some((s) => s.day === firstDay);

    let opener = `Welcome, ${name}. I'm your interviewer for the AI Engineering Cohort. I've reviewed your progress — ${candidate.signals.missionsCompleted} missions completed, strong signals on several core topics. Let's dive in.`;

    if (isStrength) {
      opener += ` You cleared Day ${firstDay} (${dayInfo.title}) on the first try, so I'm going to start there and push a bit.`;
    } else if (isStruggle) {
      opener += ` I noticed Day ${firstDay} (${dayInfo.title}) took a few attempts. I'd like to revisit that area — not to re-test the mission, but to see how your understanding has settled.`;
    } else {
      opener += ` Let's begin with Day ${firstDay}: ${dayInfo.title}.`;
    }

    const question = buildQuestion(dayInfo, profile, true, candidate.member.jobRole);
    return `${opener}\n\n${question}`;
  }

  const lastFocus = session.currentFocusDay!;
  const dayInfo = getDay(lastFocus)!;
  const lower = (candidateMessage || "").toLowerCase().trim();

  if (
    lower.includes("i don't know") ||
    lower.includes("not sure") ||
    lower.includes("no idea") ||
    lower.length < 12
  ) {
    session.coveredDays.add(lastFocus);
    const nextDay = pickNextDay(session);
    session.currentFocusDay = nextDay;
    session.questionCount += 1;
    const nextInfo = getDay(nextDay)!;
    return `No problem — we'll mark that as an area to strengthen and move on. Let's shift to Day ${nextDay}: ${nextInfo.title}.\n\n${buildQuestion(nextInfo, profile, false, candidate.member.jobRole)}`;
  }

  const shouldFollowUp =
    session.questionCount < MIN_QUESTIONS &&
    Math.random() < 0.55 &&
    session.coveredDays.size < MIN_DAYS + 2;

  if (shouldFollowUp) {
    session.questionCount += 1;
    return buildFollowUp(dayInfo, candidateMessage || "", profile, candidate.member.jobRole);
  }

  session.coveredDays.add(lastFocus);
  const nextDay = pickNextDay(session);
  session.currentFocusDay = nextDay;
  session.questionCount += 1;
  const nextInfo = getDay(nextDay)!;

  const ack = generateAck(candidateMessage || "");
  return `${ack} Let's move to Day ${nextDay} (${nextInfo.title}).\n\n${buildQuestion(nextInfo, profile, false, candidate.member.jobRole)}`;
}

function buildQuestion(
  day: ReturnType<typeof getDay>,
  profile: InterviewProfile,
  isFirst: boolean,
  role: string
): string {
  if (!day) return "Walk me through a technical decision you made recently.";

  const isStruggle = profile.struggles.some((s) => s.day === day.day);
  const obj = day.objectives[Math.floor(Math.random() * day.objectives.length)];

  if (isStruggle) {
    return `On Day ${day.day} you worked through "${day.title}". Looking back, what part of ${obj.toLowerCase()} felt hardest at the time, and how would you explain that concept now to a teammate?`;
  }

  if (role.toLowerCase().includes("devops") && [25, 26, 27, 28].includes(day.day)) {
    return `Given your DevOps background, how would you productionize the patterns from Day ${day.day} (${day.title})? Specifically around ${obj.toLowerCase()}.`;
  }

  if (role.toLowerCase().includes("ai engineer") && day.day >= 15) {
    return `As an AI Engineer, walk me through how you would implement ${obj.toLowerCase()} in a real system. What trade-offs did you consider during the cohort?`;
  }

  return `On Day ${day.day} — ${day.title} — one of the objectives was: "${obj}". Can you walk me through how you approached that, including any tools (${day.tools.slice(0, 2).join(", ")}) you used and a concrete example?`;
}

function buildFollowUp(
  day: ReturnType<typeof getDay>,
  previousAnswer: string,
  profile: InterviewProfile,
  role: string
): string {
  if (!day) return "Can you go one level deeper on that?";

  const harder = profile.difficultyModifier > 1.1;
  if (harder) {
    return `Good. That's solid. Now push it further — how would you adapt that approach if the corpus grew 10× or if you had strict latency constraints? What would break first?`;
  }
  return `That's the right direction. Can you give me a concrete example of how you applied that during the cohort, or how you would debug it if the results started degrading?`;
}

function generateAck(answer: string): string {
  const acks = [
    "Good — that matches the mental model we want.",
    "Solid. That covers the core idea.",
    "Right, that's the practical way to think about it.",
    "Understood. Clear explanation.",
    "Nice — you connected the pieces well.",
  ];
  return acks[Math.floor(Math.random() * acks.length)];
}

export function processTurn(
  sessionId: string,
  message?: string
): {
  reply: string;
  done: boolean;
  feedback?: Session["feedback"];
  profile?: InterviewProfile;
  coveredDays?: number[];
  questionCount?: number;
} {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  if (session.done) {
    return { reply: "Interview already completed.", done: true, feedback: session.feedback };
  }

  if (message) {
    session.messages.push({ role: "candidate", content: message });
  }

  const enoughQuestions = session.questionCount >= MIN_QUESTIONS;
  const enoughDays = session.coveredDays.size >= MIN_DAYS;
  const forceEnd = session.questionCount >= 12;

  if ((enoughQuestions && enoughDays) || forceEnd) {
    session.done = true;
    session.feedback = generateFeedback(session);
    const finalReply =
      "I have enough signal. Thank you — that concludes the interview. Here's your feedback.";
    session.messages.push({ role: "interviewer", content: finalReply });
    return {
      reply: finalReply,
      done: true,
      feedback: session.feedback,
      profile: session.profile,
      coveredDays: Array.from(session.coveredDays),
      questionCount: session.questionCount,
    };
  }

  const reply = generateReply(session, message);
  session.messages.push({ role: "interviewer", content: reply });

  return {
    reply,
    done: false,
    profile: session.profile,
    coveredDays: Array.from(session.coveredDays),
    questionCount: session.questionCount,
  };
}

function generateFeedback(session: Session): Session["feedback"] {
  const { profile, coveredDays, candidate } = session;
  const covered = Array.from(coveredDays);

  const strengths: string[] = [];
  profile.strengths
    .filter((s) => covered.includes(s.day))
    .forEach((s) => {
      strengths.push(`Strong first-try mastery of Day ${s.day} (${s.title})`);
    });
  if (strengths.length === 0) {
    strengths.push(`Clear communication on core RAG and agent concepts`);
  }

  const gaps: string[] = [];
  profile.gaps.forEach((g) => {
    gaps.push(`Day ${g.day} (${g.title}) was skipped — recommend a focused review`);
  });
  profile.struggles
    .filter((s) => covered.includes(s.day))
    .forEach((s) => {
      gaps.push(`Day ${s.day} required multiple attempts — deepen practical debugging intuition`);
    });

  const next: string[] = [];
  if (candidate.member.jobRole.toLowerCase().includes("devops")) {
    next.push("Practice end-to-end deployment of a RAG service with observability (Days 24–28)");
  } else if (candidate.member.jobRole.toLowerCase().includes("ai")) {
    next.push("Build a multi-agent system with MCP tools and evaluation harness");
  } else {
    next.push("Revisit any skipped modules and write a short design doc for a production RAG pipeline");
  }
  next.push("Schedule a mock system-design interview focused on LLM application architecture");
  next.push("Contribute a small improvement to the cohort's evaluation or monitoring tooling");

  const summary = `${candidate.member.name} demonstrated solid command of the topics covered in this interview (Days ${covered
    .sort((a, b) => a - b)
    .join(", ")}). Role alignment with ${candidate.member.jobRole} was taken into account. Engagement signals and first-try rate informed the difficulty curve.`;

  return { summary, strengths, gaps, next };
}
