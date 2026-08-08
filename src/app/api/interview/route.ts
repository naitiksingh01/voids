import { NextRequest, NextResponse } from "next/server";
import { startSession, processTurn } from "@/lib/interview";
import { Candidate } from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, candidate, message } = body;

    if (candidate && message === undefined) {
      const session = startSession(candidate as Candidate, sessionId);
      const result = await processTurn(session.id);
      return NextResponse.json({
        reply: result.reply,
        why: result.why,
        done: result.done,
        sessionId: session.id,
        profile: result.profile,
        coveredDays: result.coveredDays,
        questionCount: result.questionCount,
      });
    }

    if (sessionId && message !== undefined) {
      const result = await processTurn(sessionId, message);
      return NextResponse.json({
        reply: result.reply,
        why: result.why,
        done: result.done,
        feedback: result.feedback,
        profile: result.profile,
        coveredDays: result.coveredDays,
        questionCount: result.questionCount,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
