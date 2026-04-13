import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/teams/metrics - Get team performance metrics for the team leader
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

    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: { teamLeaderId: userId },
      select: { id: true, name: true, email: true },
    });

    // Get current user (the team leader) to include in metrics
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // Include team leader themselves in the member list for metrics
    const allMembers = currentUser
      ? [{ ...currentUser, isLeader: true }, ...teamMembers.map(m => ({ ...m, isLeader: false }))]
      : teamMembers.map(m => ({ ...m, isLeader: false }));

    const allMemberIds = allMembers.map((m) => m.id);

    // Get all leads for team members + team leader
    const leads = await prisma.lead.findMany({
      where: { assignedTo: { in: allMemberIds } },
      select: {
        id: true,
        status: true,
        priority: true,
        assignedTo: true,
        saleAmount: true,
        createdAt: true,
        convertedAt: true,
        public: true,
      },
    });

    // Calculate per-member metrics
    const memberMetrics = allMembers.map((member) => {
      const memberLeads = leads.filter((l) => l.assignedTo === member.id);
      const converted = memberLeads.filter(
        (l) => String(l.status).toUpperCase() === "CONVERTED"
      );
      const totalSaleAmount = converted.reduce(
        (sum, l) => sum + Number(l.saleAmount || 0),
        0
      );

      return {
        userId: member.id,
        name: member.name + ((member as any).isLeader ? " (You)" : ""),
        email: member.email,
        isLeader: (member as any).isLeader || false,
        totalLeads: memberLeads.length,
        newLeads: memberLeads.filter(
          (l) => String(l.status).toUpperCase() === "NEW"
        ).length,
        contactedLeads: memberLeads.filter(
          (l) => String(l.status).toUpperCase() === "CONTACTED"
        ).length,
        interestedLeads: memberLeads.filter(
          (l) => String(l.status).toUpperCase() === "INTERESTED"
        ).length,
        convertedLeads: converted.length,
        totalSaleAmount,
        conversionRate:
          memberLeads.length > 0
            ? ((converted.length / memberLeads.length) * 100).toFixed(1)
            : "0.0",
      };
    });

    // Overall team stats
    const totalTeamLeads = leads.length;
    const totalConverted = leads.filter(
      (l) => String(l.status).toUpperCase() === "CONVERTED"
    ).length;
    const totalSales = leads
      .filter((l) => String(l.status).toUpperCase() === "CONVERTED")
      .reduce((sum, l) => sum + Number(l.saleAmount || 0), 0);

    return NextResponse.json({
      ok: true,
      teamStats: {
        totalMembers: allMembers.length,
        totalLeads: totalTeamLeads,
        totalConverted,
        totalSales,
        conversionRate:
          totalTeamLeads > 0
            ? ((totalConverted / totalTeamLeads) * 100).toFixed(1)
            : "0.0",
      },
      memberMetrics,
    });
  } catch (error) {
    console.error("Error fetching team metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch team metrics" },
      { status: 500 }
    );
  }
}
