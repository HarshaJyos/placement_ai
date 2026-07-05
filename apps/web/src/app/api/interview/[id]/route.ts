import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
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

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            response: true,
          },
        },
      },
    });

    if (!interview || interview.userId !== userId) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json({ interview });
  } catch (error: any) {
    console.error("Fetch Interview Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while fetching the interview" },
      { status: 500 }
    );
  }
}
