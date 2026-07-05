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
    const baseStorage = process.env.STORAGE_DIR || path.resolve(process.cwd(), "..", "..", "storage");
    const storageDir = path.join(baseStorage, "audio");
    await mkdir(storageDir, { recursive: true });

    const fileExtension = path.extname(file.name) || ".webm";
    const filename = `${questionId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(storageDir, filename);

    await writeFile(filePath, buffer);

    // Save video file if present in formData
    const videoFile = formData.get("video") as File | null;
    let videoFilePath: string | null = null;

    if (videoFile) {
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      const baseStorage = process.env.STORAGE_DIR || path.resolve(process.cwd(), "..", "..", "storage");
      const videoStorageDir = path.join(baseStorage, "video");
      await mkdir(videoStorageDir, { recursive: true });
      const videoExtension = path.extname(videoFile.name) || ".webm";
      const videoFilename = `${questionId}_${Date.now()}${videoExtension}`;
      videoFilePath = path.join(videoStorageDir, videoFilename);
      await writeFile(videoFilePath, videoBuffer);
    }

    // Save/Update response in SQLite DB with only the URLs
    const dbResponse = await prisma.response.upsert({
      where: { questionId },
      update: {
        audioUrl: filePath,
        videoUrl: videoFilePath,
      },
      create: {
        questionId,
        audioUrl: filePath,
        videoUrl: videoFilePath,
      },
    });

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
