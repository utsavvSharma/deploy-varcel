import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.sub as string;
  const userRole = String(session.role).toUpperCase();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const whereClause: any = (userRole === 'SALES' || userRole === 'TEAM_LEADER')
    ? { assignedTo: userId }
    : {};

  try {
    const [allLeads, freshCount, oldCount, publicCount, statusGroups, priorityGroups, activeUsersCount] = await Promise.all([
      prisma.lead.findMany({ where: whereClause, select: { createdAt: true, status: true, priority: true, public: true } }),
      prisma.lead.count({ where: { ...whereClause, createdAt: { gte: sixMonthsAgo } } }),
      prisma.lead.count({ where: { ...whereClause, createdAt: { lt: sixMonthsAgo } } }),
      prisma.lead.count({ where: { ...whereClause, public: true } }),
      prisma.lead.groupBy({ by: ['status'], _count: { _all: true }, where: whereClause }),
      prisma.lead.groupBy({ by: ['priority'], _count: { _all: true }, where: whereClause }),
      prisma.userSession.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, logoutAt: null } }),
    ]);

    const totalLeads = allLeads.length;

    const leadsByStatus: Record<string, number> = { new: 0, contacted: 0, interested: 0, converted: 0 };
    for (const g of statusGroups) {
      leadsByStatus[String(g.status).toLowerCase()] = g._count._all;
    }

    const leadsByPriority: Record<string, number> = { low: 0, medium: 0, high: 0 };
    for (const g of priorityGroups) {
      leadsByPriority[String(g.priority).toLowerCase()] = g._count._all;
    }

    return NextResponse.json({
      ok: true,
      metrics: {
        totalLeads,
        freshLeads: freshCount,
        oldLeads: oldCount,
        convertedLeads: leadsByStatus.converted || 0,
        publicLeads: publicCount,
        leadsByStatus,
        leadsByPriority,
        activeUsers: activeUsersCount,
      }
    });
  } catch (error) {
    console.error('Error computing metrics:', error);
    return NextResponse.json({ ok: false, error: 'Failed to compute metrics' }, { status: 500 });
  }
}