import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getSession();
  if (!session || String(session.role).toUpperCase() !== 'ADMIN') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // If database URL is not configured, avoid querying and return empty result gracefully
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set; returning empty sessions list.');
    return NextResponse.json({ ok: true, sessions: [] });
  }

  try {
    const now = Date.now();
    const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

    // First, find stale sessions that need to be closed
    const staleThreshold = new Date(now - INACTIVITY_TIMEOUT_MS);
    const staleSessions = await prisma.userSession.findMany({
      where: {
        logoutAt: null,
        OR: [
          { lastActiveAt: { lt: staleThreshold } },
          { lastActiveAt: null, loginAt: { lt: staleThreshold } }
        ]
      }
    });

    // Close each stale session with proper logout time and duration
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

    const sessions = await prisma.userSession.findMany({
      orderBy: { loginAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, username: true } } },
      take: 500,
    });

    // Group sessions by user to find the most recent session for each user
    const userLatestSessions = new Map();
    sessions.forEach(session => {
      if (!userLatestSessions.has(session.userId) || 
          new Date(session.loginAt) > new Date(userLatestSessions.get(session.userId).loginAt)) {
        userLatestSessions.set(session.userId, session);
      }
    });

    const rows = sessions.map((s) => {
      const isLatestSession = userLatestSessions.get(s.userId)?.id === s.id;
      let isActive = isLatestSession && !s.logoutAt;

      // Compute stable logout/duration for non-latest sessions without logoutAt
      let computedLogoutAt: Date | null | undefined = s.logoutAt as any;
      let computedDurationSec: number | null | undefined = s.durationSec as any;

      if (!isLatestSession && !s.logoutAt) {
        // Freeze old sessions using lastActiveAt as logout time (fallback to loginAt)
        const freezeAt = s.lastActiveAt ? new Date(s.lastActiveAt) : new Date(s.loginAt);
        computedLogoutAt = freezeAt;
        const diffSec = Math.max(0, Math.floor((freezeAt.getTime() - new Date(s.loginAt).getTime()) / 1000));
        computedDurationSec = diffSec;
      } else if (s.logoutAt && (s.durationSec == null)) {
        // If logoutAt exists but duration wasn't stored, compute it
        const logoutDate = new Date(s.logoutAt);
        computedDurationSec = Math.max(0, Math.floor((logoutDate.getTime() - new Date(s.loginAt).getTime()) / 1000));
      } else if (isActive) {
        // Active latest session: show live counter if durationSec not stored yet
        if (computedDurationSec == null) {
          computedDurationSec = Math.max(0, Math.floor((Date.now() - new Date(s.loginAt).getTime()) / 1000));
        }
      }

      return {
        id: s.id,
        userId: s.userId,
        userName: s.user?.name || s.user?.username || s.user?.email || 'Unknown',
        loginAt: s.loginAt,
        logoutAt: computedLogoutAt ?? s.logoutAt ?? null,
        durationSec: computedDurationSec ?? null,
        ip: s.ip,
        userAgent: s.userAgent,
        lastActiveAt: s.lastActiveAt,
        status: isActive ? 'active' : 'offline',
        // expose a flag for UI to allow remote logout only on active sessions
        canRemoteLogout: isActive,
      };
    });

    return NextResponse.json({ ok: true, sessions: rows });
  } catch (error) {
    console.error('Error fetching sessions:', error);

    // Handle Prisma database connectivity errors more gracefully
    const errorCode = (error as any)?.code as string | undefined;
    if (errorCode === 'P1001' || errorCode === 'P1000') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Database is unreachable. Please verify database availability and credentials.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: false, error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// Remote logout of a specific session by id (admin only)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || String(session.role).toUpperCase() !== 'ADMIN') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  try {
    const body = await request.json();
    const id = (body?.id ?? '').toString();
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
    const existing = await prisma.userSession.findUnique({ where: { id }, select: { id: true, loginAt: true, logoutAt: true } });
    if (!existing) return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
    if (!existing.logoutAt) {
      const now = new Date();
      const durationSec = Math.max(0, Math.floor((now.getTime() - new Date(existing.loginAt).getTime()) / 1000));
      await prisma.userSession.update({ where: { id }, data: { logoutAt: now, durationSec } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Remote logout error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to logout session' }, { status: 500 });
  }
}


