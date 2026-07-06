import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import path from "path";

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

    // Fetch user details to find resume and github context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = user.preferredRole || "Software Engineer";
    const resumeJson = user.resumes[0]?.parsedJson || "{}";

    const githubProfile = await prisma.githubProfile.findUnique({
      where: { userId },
    });
    const githubSummary = githubProfile?.summaryJson || "[]";

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

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const isInternalAi = aiServiceUrl.includes("127.0.0.1") || 
                         aiServiceUrl.includes("localhost") || 
                         aiServiceUrl.includes("ai-service");

    // Map to answers format for the FastAPI batch evaluation
    const answersPayload = answeredQuestions.map((q) => {
      const resp = q.response!;
      let audioPath = resp.audioUrl || "";
      
      // Construct remote download URL if running behind public URL, else pass local path
      if (audioPath && !isInternalAi && process.env.NEXTAUTH_URL) {
        const filename = path.basename(audioPath);
        audioPath = `${process.env.NEXTAUTH_URL}/api/storage/audio/${filename}`;
      }

      return {
        questionId: q.id,
        category: q.category,
        text: q.text,
        audioPath,
      };
    });

    // Call Python FastAPI service /report/evaluate-interview
    const reportRes = await fetch(`${aiServiceUrl}/report/evaluate-interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRole,
        resumeJson,
        githubSummary,
        answers: answersPayload,
      }),
    });

    if (!reportRes.ok) {
      const errorText = await reportRes.text();
      throw new Error(`AI Service batch evaluation failed: ${errorText}`);
    }

    const evalData = await reportRes.json();
    const reportData = evalData.report;

    if (!evalData.questions || !reportData) {
      throw new Error("Invalid response format from AI Service batch evaluation");
    }

    // Update each response record with its transcription and individual scores in a transaction
    await prisma.$transaction(
      evalData.questions.map((qEval: any) =>
        prisma.response.update({
          where: { questionId: qEval.questionId },
          data: {
            transcript: qEval.transcript || "No transcript returned.",
            accuracyScore: qEval.accuracy || 0,
            clarityScore: qEval.clarity || 0,
            completenessScore: qEval.completeness || 0,
            communicationScore: qEval.communication || 0,
            feedback: qEval.feedback || "",
          },
        })
      )
    );

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
