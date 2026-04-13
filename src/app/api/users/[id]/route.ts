import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  context: any
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        teamLeaderId: true,
        createdAt: true,
        updatedAt: true,
        teamMembers: {
          select: { id: true, name: true, email: true, role: true }
        },
        teamLeader: {
          select: { id: true, name: true }
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        role: String(user.role).toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: any) {
  const { id } = await context.params;
  try {
    const session = await getSession();
    if (!session || String(session.role).toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const body = await request.json();

    // If username provided, ensure uniqueness (case-insensitive)
    if (typeof body.username === 'string' && body.username.trim()) {
      const existing = await prisma.user.findFirst({
        where: { id: { not: id }, username: { equals: body.username.trim(), mode: 'insensitive' } },
        select: { id: true }
      });
      if (existing) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }
    }

    // If email provided, ensure uniqueness (case-insensitive)
    if (typeof body.email === 'string' && body.email.trim()) {
      const existing = await prisma.user.findFirst({
        where: { id: { not: id }, email: { equals: body.email.trim(), mode: 'insensitive' } },
        select: { id: true }
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.username === 'string') data.username = body.username.trim() || null;
    if (typeof body.email === 'string') data.email = body.email.trim();
    
    // Handle role changes (promote/demote)
    if (typeof body.role === 'string') {
      const normalizedRole = body.role.toUpperCase();
      if (['ADMIN', 'TEAM_LEADER', 'SALES'].includes(normalizedRole)) {
        data.role = normalizedRole;
        // If demoting from TEAM_LEADER, unassign all team members
        if (normalizedRole !== 'TEAM_LEADER') {
          await prisma.user.updateMany({
            where: { teamLeaderId: id },
            data: { teamLeaderId: null }
          });
        }
        // If promoting to TEAM_LEADER, clear their own teamLeaderId
        if (normalizedRole === 'TEAM_LEADER') {
          data.teamLeaderId = null;
        }
      }
    }

    // Handle team leader assignment
    if (body.teamLeaderId !== undefined) {
      data.teamLeaderId = body.teamLeaderId || null;
    }
    
    // If password is provided, hash it
    if (typeof body.password === 'string' && body.password.length > 0) {
      data.password = await bcrypt.hash(body.password, 10);
    }

    const updated = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true, user: { ...updated, role: String(updated.role).toLowerCase() } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: any) {
  const { id } = await context.params;
  try {
    const session = await getSession();
    if (!session || String(session.role).toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const found = await prisma.user.findUnique({ where: { id } });
    if (!found) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Unassign any leads currently assigned to this user
    await prisma.lead.updateMany({ where: { assignedTo: id }, data: { assignedTo: null } });

    // Delete notes authored by this user to avoid FK constraint issues
    await prisma.note.deleteMany({ where: { userId: id } });

    // Delete user sessions to avoid FK constraint issues
    await prisma.userSession.deleteMany({ where: { userId: id } });

    // Finally delete the user
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
