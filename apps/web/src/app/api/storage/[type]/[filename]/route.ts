import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string; filename: string }> }
) {
  try {
    const { type, filename } = await params;
    
    // Validate type to prevent path traversal
    if (!["resumes", "audio", "video"].includes(type)) {
      return NextResponse.json({ error: "Invalid storage type" }, { status: 400 });
    }

    const baseStorage = process.env.STORAGE_DIR || path.resolve(process.cwd(), "..", "..", "storage");
    const filePath = path.join(baseStorage, type, filename);

    const buffer = await readFile(filePath);
    
    let contentType = "application/octet-stream";
    if (type === "resumes") contentType = "application/pdf";
    else if (type === "audio") contentType = "audio/webm";
    else if (type === "video") contentType = "video/webm";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
