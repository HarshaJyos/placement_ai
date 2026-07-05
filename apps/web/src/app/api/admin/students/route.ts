import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const currentUserRole = (session.user as any).role;
    if (currentUserRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    // Fetch all student users with resumes and interviews
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      include: {
        resumes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        interviews: {
          orderBy: { createdAt: "desc" },
          include: {
            report: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    // Map output to clean user stats
    const studentsList = students.map((std) => {
      const latestResume = std.resumes[0];
      const completedInterviews = std.interviews.filter((i) => i.status === "COMPLETED" && i.report);
      
      const latestScore = completedInterviews[0]?.report?.overallScore || null;
      const averageScore = completedInterviews.length > 0
        ? Math.round(completedInterviews.reduce((acc, curr) => acc + curr.report!.overallScore, 0) / completedInterviews.length)
        : null;

      return {
        id: std.id,
        fullName: std.fullName,
        email: std.email,
        phone: std.phone,
        college: std.college,
        degree: std.degree,
        branch: std.branch,
        gradYear: std.gradYear,
        githubUrl: std.githubUrl,
        preferredRole: std.preferredRole,
        resumeScore: latestResume?.score || null,
        interviewsCount: std.interviews.length,
        completedCount: completedInterviews.length,
        latestInterviewScore: latestScore,
        averageInterviewScore: averageScore,
      };
    });

    return NextResponse.json({ students: studentsList });
  } catch (error: any) {
    console.error("Admin Fetch Students Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while fetching student logs" },
      { status: 500 }
    );
  }
}
