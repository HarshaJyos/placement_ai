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

    // Fetch the report
    const report = await prisma.report.findUnique({
      where: { interviewId },
      include: {
        interview: {
          include: {
            questions: {
              include: {
                response: true,
              },
            },
          },
        },
      },
    });

    if (!report || report.interview.userId !== userId) {
      return NextResponse.json({ error: "Report not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Fetch Report Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while fetching the report" },
      { status: 500 }
    );
  }
}
