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
    const userId = (session.user as any).id;

    // Fetch user details including resumes
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

    // Fetch interviews of the user
    const interviews = await prisma.interview.findMany({
      where: { userId },
      include: {
        report: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        college: user.college,
        degree: user.degree,
        branch: user.branch,
        gradYear: user.gradYear,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
        preferredRole: user.preferredRole,
        role: user.role,
        resumes: user.resumes,
      },
      interviews,
    });
  } catch (error: any) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while fetching the profile details" },
      { status: 500 }
    );
  }
}
