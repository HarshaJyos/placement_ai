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

    const { preferredRole, college, degree, branch, gradYear } = await req.json();

    if (!preferredRole) {
      return NextResponse.json({ error: "Preferred role is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferredRole,
        college,
        degree,
        branch,
        gradYear: gradYear ? parseInt(gradYear) : null,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        preferredRole: updatedUser.preferredRole,
        college: updatedUser.college,
        degree: updatedUser.degree,
        branch: updatedUser.branch,
        gradYear: updatedUser.gradYear,
      },
    });
  } catch (error: any) {
    console.error("Onboarding Profile Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during onboarding profile update" },
      { status: 500 }
    );
  }
}
