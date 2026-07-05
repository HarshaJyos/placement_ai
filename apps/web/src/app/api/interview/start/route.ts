import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Retrieve user details to find resume and github
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

    // Call Python FastAPI service /questions/generate
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const genRes = await fetch(`${aiServiceUrl}/questions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeJson,
        githubSummary,
        targetRole,
      }),
    });

    if (!genRes.ok) {
      const errorText = await genRes.text();
      throw new Error(`AI Service question generation failed: ${errorText}`);
    }

    const { questions } = await genRes.json();

    if (!questions || !Array.isArray(questions)) {
      throw new Error("Invalid response format from AI service");
    }

    // Create the Interview record
    const interview = await prisma.interview.create({
      data: {
        userId,
        targetRole,
        status: "IN_PROGRESS",
      },
    });

    // Bulk insert questions with order
    await prisma.$transaction(
      questions.map((q: { category: string; text: string }, index: number) =>
        prisma.question.create({
          data: {
            interviewId: interview.id,
            category: q.category,
            text: q.text,
            order: index + 1,
          },
        })
      )
    );

    // Fetch full interview with questions to return
    const fullInterview = await prisma.interview.findUnique({
      where: { id: interview.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({
      message: "Interview started successfully",
      interview: fullInterview,
    });
  } catch (error: any) {
    console.error("Start Interview Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while starting the interview" },
      { status: 500 }
    );
  }
}
