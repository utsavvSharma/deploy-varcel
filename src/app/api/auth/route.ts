import { NextRequest, NextResponse } from "next/server";
import { createToken, comparePasswords } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, 5, 60000);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { ok: false, message: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const rawUsername = (body.username ?? "").toString();
    const password = (body.password ?? "").toString();
    const loginType = (body.loginType ?? "auto").toString();

    const identifier = rawUsername.trim();
    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, message: "Username/email and password are required" },
        { status: 400 }
      );
    }

    // Auto-detect email vs username if not explicitly provided
    const useEmail = loginType === "email" || (loginType === "auto" && identifier.includes("@"));

    let user: {
      id: string;
      username: string | null;
      email: string | null;
      password: string;
      role: string;
      name: string;
    } | null = null;

    if (useEmail) {
      user = await prisma.user.findFirst({
        where: { email: { equals: identifier, mode: "insensitive" } },
        select: { id: true, username: true, email: true, password: true, role: true, name: true }
      });
    } else {
      user = await prisma.user.findFirst({
        where: { username: { equals: identifier, mode: "insensitive" } },
        select: { id: true, username: true, email: true, password: true, role: true, name: true }
      });
    }

    if (!user) {
      return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
    }

    const passwordValid = await comparePasswords(password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken({ sub: user.id, role: user.role, name: user.name, email: user.email });

    // Create a user session record
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const ip = (request as any).ip || forwardedFor.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        ip: ip || undefined,
        userAgent: userAgent || undefined,
      },
      select: { id: true }
    });
    
    // Log LOGIN activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        description: `Logged in`,
        metadata: {
          ip: ip,
          userAgent: userAgent,
          sessionId: session.id
        }
      }
    });

    const res = NextResponse.json({
      ok: true,
      token,
      user: { id: user.id, role: user.role, name: user.name, email: user.email }
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Set session cookie
    res.cookies.set("sid", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ ok: false, message: "Authentication failed" }, { status: 500 });
  }
}
