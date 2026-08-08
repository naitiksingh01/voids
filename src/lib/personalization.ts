import { Candidate, CurriculumDay } from "./data";
import { CURRICULUM } from "./data";

export type InterviewProfile = {
  strengths: { day: number; title: string; reason: string }[];
  struggles: { day: number; title: string; attempts: number; reason: string }[];
  gaps: { day: number; title: string; reason: string }[];
  roleWeights: Record<number, number>;
  difficultyModifier: number;
  priorityDays: number[];
  prepNotes: string[];
};

export function buildInterviewProfile(candidate: Candidate): InterviewProfile {
  const missionsByDay = new Map(candidate.missions.map((m) => [m.day, m]));

  const strengths: InterviewProfile["strengths"] = [];
  const struggles: InterviewProfile["struggles"] = [];
  const gaps: InterviewProfile["gaps"] = [];

  candidate.missions.forEach((m) => {
    if (m.skipped) {
      gaps.push({
        day: m.day,
        title: m.title,
        reason: "Skipped during cohort — treat as potential gap",
      });
    } else if (m.passed && (m.attempts ?? 99) === 1) {
      strengths.push({
        day: m.day,
        title: m.title,
        reason: "Passed on first attempt — high confidence signal",
      });
    } else if (m.passed && (m.attempts ?? 0) >= 3) {
      struggles.push({
        day: m.day,
        title: m.title,
        attempts: m.attempts!,
        reason: `Required ${m.attempts} attempts — probe understanding supportively`,
      });
    }
  });

  const role = candidate.member.jobRole.toLowerCase();
  const roleWeights: Record<number, number> = {};

  CURRICULUM.days.forEach((d) => {
    let w = 1.0;
    if (role.includes("data engineer") || role.includes("senior data")) {
      if ([7, 8, 9, 10, 11, 12, 13, 24].includes(d.day)) w = 1.6;
      if ([25, 26, 27, 28].includes(d.day)) w = 1.3;
    } else if (role.includes("ai engineer")) {
      if ([11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(d.day)) w = 1.8;
      if ([7, 8, 9, 10].includes(d.day)) w = 1.4;
    } else if (role.includes("devops")) {
      if ([24, 25, 26, 27, 28].includes(d.day)) w = 2.0;
      if ([11, 13].includes(d.day)) w = 1.2;
    } else if (role.includes("business") || role.includes("analyst")) {
      if ([1, 2, 3, 4, 5, 21, 22, 29, 31].includes(d.day)) w = 1.7;
      if ([16, 19, 20, 27].includes(d.day)) w = 0.6;
    }
    roleWeights[d.day] = w;
  });

  const firstTryRatio =
    candidate.signals.missionsFirstTry / Math.max(1, candidate.signals.missionsCompleted);
  const commitRatio = candidate.signals.commitDays / 31;
  let difficultyModifier = 1.0;
  if (firstTryRatio > 0.7 && commitRatio > 0.85) difficultyModifier = 1.25;
  else if (firstTryRatio < 0.45 || commitRatio < 0.7) difficultyModifier = 0.85;

  const scored = CURRICULUM.days
    .filter((d) => {
      const m = missionsByDay.get(d.day);
      return m && !m.skipped && m.passed;
    })
    .map((d) => {
      const m = missionsByDay.get(d.day)!;
      let score = roleWeights[d.day] || 1;
      if ((m.attempts ?? 99) === 1) score *= 1.4;
      if ((m.attempts ?? 0) >= 3) score *= 1.2;
      return { day: d.day, score };
    })
    .sort((a, b) => b.score - a.score);

  const priorityDays = scored.map((s) => s.day).slice(0, 12);

  const prepNotes = [
    `Candidate: ${candidate.member.name} (${candidate.member.jobRole}, ${candidate.member.yearsExperience}y)`,
    `Engagement: ${candidate.signals.commitDays}/31 commit days, ${candidate.signals.missionsFirstTry} first-try passes → difficulty modifier ${difficultyModifier.toFixed(2)}`,
    `Strengths to lean on: ${strengths.map((s) => `D${s.day}`).join(", ") || "none flagged"}`,
    `Struggles to probe supportively: ${struggles.map((s) => `D${s.day} (${s.attempts}×)`).join(", ") || "none"}`,
    `Known gaps (skipped): ${gaps.map((g) => `D${g.day}`).join(", ") || "none"}`,
    `Role weighting applied — highest priority days: ${priorityDays.slice(0, 6).join(", ")}`,
  ];

  return {
    strengths,
    struggles,
    gaps,
    roleWeights,
    difficultyModifier,
    priorityDays,
    prepNotes,
  };
}

export function getDay(day: number): CurriculumDay | undefined {
  return CURRICULUM.days.find((d) => d.day === day);
}
