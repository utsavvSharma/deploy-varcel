import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await context.params;

    // Auto-close stale sessions (inactive for 20+ minutes)
    const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
    const staleThreshold = new Date(Date.now() - INACTIVITY_TIMEOUT_MS);
    
    const staleSessions = await prisma.userSession.findMany({
      where: {
        logoutAt: null,
        OR: [
          { lastActiveAt: { lt: staleThreshold } },
          { lastActiveAt: null, loginAt: { lt: staleThreshold } }
        ]
      }
    });

    for (const staleSession of staleSessions) {
      const logoutTime = staleSession.lastActiveAt || staleSession.loginAt;
      const duration = Math.max(0, Math.floor((new Date(logoutTime).getTime() - new Date(staleSession.loginAt).getTime()) / 1000));
      await prisma.userSession.update({
        where: { id: staleSession.id },
        data: {
          logoutAt: logoutTime,
          durationSec: duration
        }
      });
    }

    // Get activity logs
    const activityLogs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500, // Limit to last 500 activities
    });

    // Get user sessions with login/logout times
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { loginAt: "desc" },
      take: 100, // Last 100 sessions
      select: {
        id: true,
        loginAt: true,
        logoutAt: true,
        durationSec: true,
        ip: true,
        userAgent: true,
        lastActiveAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      activityLogs,
      sessions,
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 }
    );
  }
}
