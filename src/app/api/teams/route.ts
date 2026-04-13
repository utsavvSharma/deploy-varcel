import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/teams - Get all team leaders and their teams (admin) or current leader's team
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String(session.role).toUpperCase();

    if (role === "ADMIN") {
      // Admin sees all team leaders with their team members
      const teamLeaders = await prisma.user.findMany({
        where: { role: "TEAM_LEADER" },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          teamMembers: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Also get unassigned sales members (not under any team leader)
      const unassignedMembers = await prisma.user.findMany({
        where: {
          role: "SALES",
          teamLeaderId: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        ok: true,
        teamLeaders: teamLeaders.map((tl) => ({
          ...tl,
          teamMembers: tl.teamMembers.map((m: any) => ({
            ...m,
            role: String(m.role).toLowerCase(),
          })),
        })),
        unassignedMembers: unassignedMembers.map((m) => ({
          ...m,
          role: String(m.role).toLowerCase(),
        })),
      });
    }

    if (role === "TEAM_LEADER") {
      // Team leader sees their own team
      const userId = session.sub as string;

      // Fetch the team leader's own info
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, username: true, role: true },
      });

      const teamMembers = await prisma.user.findMany({
        where: { teamLeaderId: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });

      // Include the team leader themselves at the top of the list
      const allMembers = [
        ...(currentUser
          ? [{ ...currentUser, name: `${currentUser.name} (You)`, role: String(currentUser.role).toLowerCase() }]
          : []),
        ...teamMembers.map((m) => ({
          ...m,
          role: String(m.role).toLowerCase(),
        })),
      ];

      return NextResponse.json({
        ok: true,
        teamMembers: allMembers,
      });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Assign a team member to a team leader (admin only)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || String(session.role).toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId, teamLeaderId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.role !== "SALES") {
      return NextResponse.json(
        { error: "Only sales team members can be assigned to a team leader" },
        { status: 400 }
      );
    }

    if (teamLeaderId) {
      const leader = await prisma.user.findUnique({
        where: { id: teamLeaderId },
      });
      if (!leader || leader.role !== "TEAM_LEADER") {
        return NextResponse.json(
          { error: "Team leader not found" },
          { status: 404 }
        );
      }
    }

    await prisma.user.update({
      where: { id: memberId },
      data: { teamLeaderId: teamLeaderId || null },
    });

    // Log activity
    const currentUserId = session.sub as string;
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: teamLeaderId ? "TEAM_MEMBER_ASSIGNED" : "TEAM_MEMBER_REMOVED",
        description: teamLeaderId
          ? `Assigned ${member.name} to a team leader`
          : `Removed ${member.name} from team`,
        metadata: {
          memberId,
          memberName: member.name,
          teamLeaderId: teamLeaderId || null,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error assigning team member:", error);
    return NextResponse.json(
      { error: "Failed to assign team member" },
      { status: 500 }
    );
  }
}
