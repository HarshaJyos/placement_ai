import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
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

    // Verify interview exists and belongs to the user
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.userId !== userId) {
      return NextResponse.json({ error: "Interview not found or access denied" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const questionId = formData.get("questionId") as string;

    if (!file || !questionId) {
      return NextResponse.json(
        { error: "Missing required fields (file, questionId)" },
        { status: 400 }
      );
    }

    // Verify the question belongs to this interview
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question || question.interviewId !== interviewId) {
      return NextResponse.json({ error: "Question not found in this interview" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save audio file locally to storage/audio/
    // Since process.cwd() is inside apps/web/, the storage folder is at ../../storage/audio
    const storageDir = path.resolve(process.cwd(), "..", "..", "storage", "audio");
    await mkdir(storageDir, { recursive: true });

    const fileExtension = path.extname(file.name) || ".webm";
    const filename = `${questionId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(storageDir, filename);

    await writeFile(filePath, buffer);

    // Call Python FastAPI service /transcribe
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    
    let transcript = "No speech detected.";
    try {
      const transRes = await fetch(`${aiServiceUrl}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: filePath }),
      });

      if (transRes.ok) {
        const transJson = await transRes.json();
        transcript = transJson.transcript || transcript;
      } else {
        console.error("FastAPI transcription failed, running fallback.");
      }
    } catch (transErr) {
      console.error("Transcription connection error:", transErr);
    }

    // Call Python FastAPI service /evaluate
    let evalJson = {
      accuracy: 0,
      clarity: 0,
      completeness: 0,
      communication: 0,
      feedback: "Failed to connect to the evaluation service.",
    };

    try {
      const evalRes = await fetch(`${aiServiceUrl}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: question.text,
          transcript,
          category: question.category,
        }),
      });

      if (evalRes.ok) {
        evalJson = await evalRes.json();
      } else {
        console.error("FastAPI evaluation failed.");
      }
    } catch (evalErr) {
      console.error("Evaluation connection error:", evalErr);
    }

    // Save/Update response in SQLite DB
    const dbResponse = await prisma.response.upsert({
      where: { questionId },
      update: {
        audioUrl: filePath,
        transcript,
        accuracyScore: evalJson.accuracy,
        clarityScore: evalJson.clarity,
        completenessScore: evalJson.completeness,
        communicationScore: evalJson.communication,
        feedback: evalJson.feedback,
      },
      create: {
        questionId,
        audioUrl: filePath,
        transcript,
        accuracyScore: evalJson.accuracy,
        clarityScore: evalJson.clarity,
        completenessScore: evalJson.completeness,
        communicationScore: evalJson.communication,
        feedback: evalJson.feedback,
      },
    });

    // Update interview status to IN_PROGRESS (if it was PENDING)
    if (interview.status === "PENDING") {
      await prisma.interview.update({
        where: { id: interviewId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return NextResponse.json({
      message: "Answer processed successfully",
      response: dbResponse,
    });
  } catch (error: any) {
    console.error("Process Answer Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while processing the answer" },
      { status: 500 }
    );
  }
}
