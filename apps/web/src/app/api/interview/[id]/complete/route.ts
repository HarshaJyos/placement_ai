import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id: interviewId } = await params;

    // Fetch the interview with questions and responses
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        questions: {
          include: {
            response: true,
          },
        },
      },
    });

    if (!interview || interview.userId !== userId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Filter questions that have responses
    const answeredQuestions = interview.questions.filter((q) => q.response);

    if (answeredQuestions.length === 0) {
      return NextResponse.json(
        { error: "Cannot complete an interview with zero answered questions" },
        { status: 400 }
      );
    }

    // Map to responses format for FastAPI
    const responsesPayload = answeredQuestions.map((q) => {
      const resp = q.response!;
      return {
        category: q.category,
        text: q.text,
        transcript: resp.transcript || "No transcript provided.",
        accuracyScore: resp.accuracyScore || 0,
        clarityScore: resp.clarityScore || 0,
        completenessScore: resp.completenessScore || 0,
        communicationScore: resp.communicationScore || 0,
      };
    });

    // Call Python FastAPI service /report/generate
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const reportRes = await fetch(`${aiServiceUrl}/report/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: responsesPayload }),
    });

    if (!reportRes.ok) {
      const errorText = await reportRes.text();
      throw new Error(`AI Service report generation failed: ${errorText}`);
    }

    const reportData = await reportRes.json();

    // Create or update the report inside DB
    const report = await prisma.report.upsert({
      where: { interviewId },
      update: {
        overallScore: reportData.overallScore || 0,
        technicalScore: reportData.technicalScore || 0,
        communicationScore: reportData.communicationScore || 0,
        projectScore: reportData.projectScore || 0,
        hrScore: reportData.hrScore || 0,
        strengths: JSON.stringify(reportData.strengths || []),
        weaknesses: JSON.stringify(reportData.weaknesses || []),
        suggestions: JSON.stringify(reportData.suggestions || []),
      },
      create: {
        interviewId,
        overallScore: reportData.overallScore || 0,
        technicalScore: reportData.technicalScore || 0,
        communicationScore: reportData.communicationScore || 0,
        projectScore: reportData.projectScore || 0,
        hrScore: reportData.hrScore || 0,
        strengths: JSON.stringify(reportData.strengths || []),
        weaknesses: JSON.stringify(reportData.weaknesses || []),
        suggestions: JSON.stringify(reportData.suggestions || []),
      },
    });

    // Mark interview as completed
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Interview finalized and report compiled successfully",
      report,
    });
  } catch (error: any) {
    console.error("Complete Interview Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while compiling the interview report" },
      { status: 500 }
    );
  }
}
