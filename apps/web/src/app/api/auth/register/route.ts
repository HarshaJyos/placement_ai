import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { fullName, email, password } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields (fullName, email, password)" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default first user as ADMIN so it is easy to test admin panels, subsequent users as STUDENT.
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "STUDENT";

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role,
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during registration" },
      { status: 500 }
    );
  }
}
