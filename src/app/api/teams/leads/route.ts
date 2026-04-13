import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/teams/leads - Get all leads assigned to the team leader's team members
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String(session.role).toUpperCase();
    const userId = session.sub as string;

    if (role !== "TEAM_LEADER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the team leader's own info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // Get all team members under this leader
    const teamMembers = await prisma.user.findMany({
      where: { teamLeaderId: userId },
      select: { id: true, name: true },
    });

    const teamMemberIds = teamMembers.map((m) => m.id);

    // Include the team leader themselves in the list
    const allIds = [userId, ...teamMemberIds];

    // Get all leads assigned to team members + team leader's own leads
    const leads = await prisma.lead.findMany({
      where: {
        assignedTo: { in: allIds },
      },
      include: {
        notes: true,
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Include the team leader at the top of teamMembers list
    const allMembers = [
      ...(currentUser ? [{ id: currentUser.id, name: `${currentUser.name} (You)` }] : []),
      ...teamMembers,
    ];

    return NextResponse.json({
      ok: true,
      leads,
      teamMembers: allMembers,
    });
  } catch (error) {
    console.error("Error fetching team leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch team leads" },
      { status: 500 }
    );
  }
}
