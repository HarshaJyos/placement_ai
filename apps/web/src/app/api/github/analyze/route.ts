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

    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    // Clean username (in case they passed a full link)
    const cleanedUsername = username.split("/").pop()?.trim() || username.trim();

    // Call Python FastAPI service /github/analyze
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const analyzeRes = await fetch(`${aiServiceUrl}/github/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanedUsername }),
    });

    if (!analyzeRes.ok) {
      const errorText = await analyzeRes.text();
      throw new Error(`AI Service github analyze failed: ${errorText}`);
    }

    const summaryJson = await analyzeRes.json();

    // Save profile or update if already exists
    await prisma.githubProfile.upsert({
      where: { userId },
      update: {
        username: cleanedUsername,
        summaryJson: JSON.stringify(summaryJson),
        fetchedAt: new Date(),
      },
      create: {
        userId,
        username: cleanedUsername,
        summaryJson: JSON.stringify(summaryJson),
      },
    });

    // Update githubUrl in User model
    const githubUrl = `https://github.com/${cleanedUsername}`;
    await prisma.user.update({
      where: { id: userId },
      data: { githubUrl },
    });

    return NextResponse.json({
      message: "GitHub profile analyzed successfully",
      profile: {
        username: cleanedUsername,
        summaryJson,
      },
    });
  } catch (error: any) {
    console.error("GitHub Analyze Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during GitHub analysis" },
      { status: 500 }
    );
  }
}
