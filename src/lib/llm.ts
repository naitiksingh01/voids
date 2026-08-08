import { InterviewProfile } from "./personalization";
import { Candidate } from "./data";
import { getDay } from "./personalization";

export async function generateInterviewReply(params: {
  candidate: Candidate;
  profile: InterviewProfile;
  history: { role: "interviewer" | "candidate"; content: string }[];
  questionCount: number;
  coveredDays: number[];
  isFinal?: boolean;
}): Promise<{ reply: string; why: string; shouldEnd: boolean }> {
  const { candidate, profile, history, questionCount, coveredDays, isFinal } = params;
  const name = candidate.member.name.split(" ")[0];
  const role = candidate.member.jobRole;
  const lastMsg = (history.filter((m) => m.role === "candidate").pop()?.content || "").toLowerCase().trim();

  // ========== FINAL TURN ==========
  if (isFinal) {
    return {
      reply: `I have enough signal, ${name}. Thank you — that concludes the interview. I'll now prepare your detailed feedback report.`,
      why: "Coverage and question count targets reached.",
      shouldEnd: true,
    };
  }

  // ========== HANDLE META / OFF-TOPIC QUESTIONS ==========
  if (
    lastMsg.includes("what is your name") ||
    lastMsg.includes("what's your name") ||
    lastMsg.includes("who are you") ||
    lastMsg.includes("your name") ||
    lastMsg === "name"
  ) {
    return {
      reply: `I'm your technical interviewer for this session — you can just call me the Interviewer. Let's stay focused on your technical experience.\n\nShall we continue with the next question?`,
      why: "Candidate asked a meta question about the interviewer's name. Responded in character and steered back.",
      shouldEnd: false,
    };
  }

  if (
    lastMsg.includes("how are you") ||
    lastMsg.includes("how's it going") ||
    lastMsg.includes("hello") ||
    lastMsg.includes("hi ") ||
    lastMsg === "hi" ||
    lastMsg === "hey"
  ) {
    return {
      reply: `I'm doing well, thanks for asking. Let's keep the focus on your technical skills though.\n\nReady for the next question?`,
      why: "Polite small-talk detected. Acknowledged briefly and redirected to the interview.",
      shouldEnd: false,
    };
  }

  // ========== FIRST QUESTION ==========
  if (questionCount === 0) {
    const day = profile.priorityDays[0] || 11;
    const dayInfo = getDay(day);
    const isStrength = profile.strengths.some((s) => s.day === day);
    const isStruggle = profile.struggles.some((s) => s.day === day);

    let opener = `Welcome, ${name}. I've reviewed your cohort progress — ${candidate.signals.missionsCompleted} missions completed. `;

    if (isStrength) {
      opener += `You cleared Day ${day} (${dayInfo?.title}) on the first try, so I'm starting there and will push deeper.`;
    } else if (isStruggle) {
      opener += `I noticed Day ${day} (${dayInfo?.title}) took several attempts. I'd like to revisit it supportively.`;
    } else {
      opener += `Let's begin with Day ${day}: ${dayInfo?.title}.`;
    }

    const question = buildSmartQuestion(day, profile, role, true);

    return {
      reply: `${opener}\n\n${question}`,
      why: `Priority day ${day} selected from role weighting + strength/struggle signals.`,
      shouldEnd: false,
    };
  }

  // ========== HANDLE WEAK / "I DON'T KNOW" ==========
  if (
    lastMsg.includes("i don't know") ||
    lastMsg.includes("i do not know") ||
    lastMsg.includes("not sure") ||
    lastMsg.includes("no idea") ||
    lastMsg.includes("idk") ||
    lastMsg.length < 15
  ) {
    const nextDay = pickNextDay(profile, coveredDays);
    const nextInfo = getDay(nextDay);
    return {
      reply: `No problem — we'll note that as an area to strengthen. Let's move to Day ${nextDay}: ${nextInfo?.title}.\n\n${buildSmartQuestion(nextDay, profile, role, false)}`,
      why: "Candidate gave weak or 'I don't know' answer → marked as gap and moved to next priority day.",
      shouldEnd: false,
    };
  }

  // ========== NORMAL FLOW: Follow-up or New Question ==========
  const doFollowUp = questionCount < 9 && Math.random() > 0.42;

  if (doFollowUp) {
    const follow = buildFollowUp(lastMsg, profile.difficultyModifier > 1.1);
    return {
      reply: follow,
      why: "Follow-up chosen to go deeper on the previous answer.",
      shouldEnd: false,
    };
  }

  // Move to a new day
  const nextDay = pickNextDay(profile, coveredDays);
  const nextInfo = getDay(nextDay);
  const ack = getAck();

  return {
    reply: `${ack} Let's shift to Day ${nextDay} (${nextInfo?.title}).\n\n${buildSmartQuestion(nextDay, profile, role, false)}`,
    why: `Moved to new priority day ${nextDay} after sufficient depth on the previous topic.`,
    shouldEnd: false,
  };
}

// ===== Helper functions =====
function pickNextDay(profile: InterviewProfile, covered: number[]): number {
  const remaining = profile.priorityDays.filter((d) => !covered.includes(d));
  return remaining[0] || profile.priorityDays[0] || 11;
}

function buildSmartQuestion(
  day: number,
  profile: InterviewProfile,
  role: string,
  isFirst: boolean
): string {
  const dayInfo = getDay(day);
  if (!dayInfo) return "Walk me through a recent technical decision you made in one of your projects.";

  const isStruggle = profile.struggles.some((s) => s.day === day);
  const title = dayInfo.title;
  const tools = dayInfo.tools.slice(0, 2).join(" / ");

  // Realistic question bank
  const conceptual = [
    `If you had to explain "${title}" to a junior developer in 2 minutes, how would you do it?`,
    `What's the core idea behind ${title} that most people get wrong?`,
    `When would you decide *not* to use the approach you learned in ${title}?`,
  ];

  const practical = [
    `Walk me through how you actually implemented something from "${title}" during the cohort. What did the code structure look like?`,
    `Can you describe a concrete example where you used ${tools} for ${title}? What worked and what didn't?`,
    `If I gave you a messy real-world problem right now, how would you apply what you learned in Day ${day}?`,
  ];

  const scenario = [
    `Imagine you're in a production system and the approach from "${title}" starts failing. How would you debug it?`,
    `Your manager asks you to improve performance related to ${title}. What are the first three things you would check?`,
    `How would you design this differently if you had to support 10x more users or data?`,
  ];

  const struggleStyle = [
    `I saw that "${title}" took you a few attempts. Looking back, what was the part that clicked last for you?`,
    `Many people struggle with ${title}. What specifically made it hard, and how do you think about it now?`,
    `If you had to teach the hardest part of Day ${day} to someone else, how would you explain it?`,
  ];

  let pool: string[] = [];

  if (isStruggle) {
    pool = [...struggleStyle, ...conceptual];
  } else if (role.toLowerCase().includes("devops") && day >= 24) {
    pool = [
      `From a DevOps perspective, how would you productionize the ideas from "${title}"?`,
      `How would you add monitoring, alerting, and rollback strategies around what you built in Day ${day}?`,
      `What would your CI/CD pipeline look like for something involving ${title}?`,
      ...scenario,
    ];
  } else if (role.toLowerCase().includes("ai engineer") && day >= 15) {
    pool = [
      `As an AI Engineer, how would you harden or scale the approach from "${title}"?`,
      `What evaluation metrics would you put around a system using ${title}?`,
      `How do you think about cost vs quality trade-offs in ${title}?`,
      ...practical,
      ...scenario,
    ];
  } else if (role.toLowerCase().includes("business") || role.toLowerCase().includes("analyst")) {
    pool = [
      `How would you explain the business value of "${title}" to a non-technical stakeholder?`,
      `What decision would this capability unlock for a product team?`,
      `What risks would you highlight if a company adopted this approach?`,
      ...conceptual,
    ];
  } else {
    pool = [...practical, ...conceptual, ...scenario];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function buildFollowUp(previous: string, harder: boolean): string {
  const lower = previous.toLowerCase();

  // Smarter follow-ups based on keywords
  if (lower.includes("chunk") || lower.includes("split") || lower.includes("embed")) {
    return harder
      ? `Interesting. How would your chunking / embedding strategy change if the documents were highly technical and full of tables or code?`
      : `Got it. Can you walk me through a specific example of a chunk that worked well versus one that didn't?`;
  }

  if (lower.includes("rag") || lower.includes("retriev") || lower.includes("context")) {
    return harder
      ? `Okay. Now what happens when the retrieved context is partially wrong or outdated? How do you detect and handle that?`
      : `Makes sense. How do you decide how many documents to retrieve, and what do you do if the answer still isn't grounded?`;
  }

  if (lower.includes("agent") || lower.includes("tool") || lower.includes("function")) {
    return harder
      ? `Good. How would you prevent the agent from getting stuck in a loop or making expensive repeated calls?`
      : `Clear. Can you give me an example of a tool you would define and how the agent decides to use it?`;
  }

  if (lower.includes("docker") || lower.includes("k8s") || lower.includes("deploy") || lower.includes("kubernetes")) {
    return `Nice. How would you handle secrets, scaling, and zero-downtime deployments in that setup?`;
  }

  // Generic but natural follow-ups
  const normalFollowUps = [
    `That makes sense. Can you go one level deeper — what would the actual code or architecture look like?`,
    `Okay, good. What was the hardest part when you tried this during the cohort?`,
    `Got it. If this failed in production, what’s the first thing you would check?`,
    `Clear. How would you explain this approach to someone who has never seen it before?`,
    `Interesting. What trade-offs did you consider when you chose this method?`,
  ];

  const harderFollowUps = [
    `Alright, let’s push it. How does this break when traffic spikes or the data distribution shifts?`,
    `Good foundation. Now design the monitoring and alerting you would put around this.`,
    `Solid. What would you change if you had to make this work with much stricter latency or cost limits?`,
    `Okay. How would you A/B test or evaluate whether this approach is actually better?`,
  ];

  const pool = harder ? harderFollowUps : normalFollowUps;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getAck(): string {
  const acks = [
    "Good — that matches the mental model we want.",
    "Solid explanation.",
    "Right, that's a practical way to think about it.",
    "Clear. You connected the pieces well.",
    "Understood. Nice structure.",
    "That's a good way to look at it.",
    "Makes sense.",
    "Okay, I’m with you.",
  ];
  return acks[Math.floor(Math.random() * acks.length)];
}
