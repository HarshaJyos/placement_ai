import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Save to storage/resumes/
    const baseStorage = process.env.STORAGE_DIR || path.resolve(process.cwd(), "..", "..", "storage");
    const storageDir = path.join(baseStorage, "resumes");
    await mkdir(storageDir, { recursive: true });

    const fileExtension = path.extname(file.name) || ".pdf";
    const filename = `${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(storageDir, filename);

    await writeFile(filePath, buffer);

    // Call Python FastAPI service /resume/parse
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    
    // Construct remote download URL if running behind public URL, else pass local path
    let fileUrl = filePath;
    const isInternalAi = aiServiceUrl.includes("127.0.0.1") || 
                         aiServiceUrl.includes("localhost") || 
                         aiServiceUrl.includes("ai-service");
    if (!isInternalAi && process.env.NEXTAUTH_URL) {
      const filename = path.basename(filePath);
      fileUrl = `${process.env.NEXTAUTH_URL}/api/storage/resumes/${filename}`;
    }

    const parseRes = await fetch(`${aiServiceUrl}/resume/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl }),
    });

    if (!parseRes.ok) {
      const errorText = await parseRes.text();
      throw new Error(`AI Service parse failed: ${errorText}`);
    }

    const parsedJson = await parseRes.json();
    const score = parsedJson.score || 0;

    // Save in DB
    const resume = await prisma.resume.create({
      data: {
        userId,
        fileUrl: filePath,
        parsedJson: JSON.stringify(parsedJson),
        score,
      },
    });

    return NextResponse.json({
      message: "Resume uploaded and parsed successfully",
      resume: {
        id: resume.id,
        score: resume.score,
        parsedJson,
      },
    });
  } catch (error: any) {
    console.error("Resume Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during resume upload" },
      { status: 500 }
    );
  }
}
