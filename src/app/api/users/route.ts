import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
// Note: NextRequest imported if needed later

export async function GET() {
  try {
    const session = await getSession();
    if (!session || String(session.role).toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, username: true, role: true, teamLeaderId: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' }
    });
    type ApiUser = { id: string; name: string; email: string | null; username: string | null; role: string; teamLeaderId: string | null; createdAt: Date; updatedAt: Date };
    const normalized: ApiUser[] = users.map((u: any) => ({ ...u, role: String(u.role).toLowerCase() }));
    return NextResponse.json({ ok: true, users: normalized });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || String(session.role).toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const { name, email, username, password, role } = await req.json();
    
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingByEmail = await prisma.user.findFirst({ where: { email } });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    if (username) {
      const existingByUsername = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
      if (existingByUsername) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hash(password, 10);

    type RoleEnum = 'ADMIN' | 'TEAM_LEADER' | 'SALES';
    const normalizedRole = String(role).toUpperCase();
    const prismaRole: RoleEnum = normalizedRole === 'ADMIN' ? 'ADMIN' : normalizedRole === 'TEAM_LEADER' ? 'TEAM_LEADER' : 'SALES';

    const created = await prisma.user.create({
      data: {
        name,
        email,
        username: username || null,
        password: hashedPassword,
        role: prismaRole,
      },
      select: { id: true, name: true, email: true, username: true, role: true, createdAt: true, updatedAt: true }
    });

    // Normalize role to lowercase for UI consistency
    return NextResponse.json({ ok: true, user: { ...created, role: created.role.toLowerCase() } });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
