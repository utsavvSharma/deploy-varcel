import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const role = typeof session.role === 'string' ? String(session.role).toLowerCase().replace('_', '_') : 'sales';
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;
    
    const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
    const now = Date.now();
    const staleThreshold = new Date(now - INACTIVITY_TIMEOUT_MS);
    
    // Proactively close ALL stale sessions across all users
    const staleSessions = await prisma.userSession.findMany({
      where: {
        logoutAt: null,
        OR: [
          { lastActiveAt: { lt: staleThreshold } },
          { lastActiveAt: null, loginAt: { lt: staleThreshold } }
        ]
      },
      take: 50 // Limit to 50 per heartbeat to avoid performance issues
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
    
    if (sid) {
      const existing = await prisma.userSession.findUnique({ where: { id: sid } });
      if (existing) {
        // If already closed, clear cookies and force logout
        if (existing.logoutAt) {
          const res = NextResponse.json({ ok: false }, { status: 401 });
          res.cookies.set('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
          res.cookies.set('sid', '', { httpOnly: true, expires: new Date(0), path: '/' });
          return res;
        }
        const lastActive = existing.lastActiveAt ? new Date(existing.lastActiveAt).getTime() : new Date(existing.loginAt).getTime();
        const now = Date.now();
        if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
          // Auto-close due to inactivity
          const logoutAt = new Date(lastActive);
          const durationSec = Math.max(0, Math.floor((logoutAt.getTime() - new Date(existing.loginAt).getTime()) / 1000));
          await prisma.userSession.update({ where: { id: sid }, data: { logoutAt, durationSec } });
          const res = NextResponse.json({ ok: false }, { status: 401 });
          res.cookies.set('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
          res.cookies.set('sid', '', { httpOnly: true, expires: new Date(0), path: '/' });
          return res;
        }
        // Otherwise, update heartbeat to now
        await prisma.userSession.update({ where: { id: sid }, data: { lastActiveAt: new Date() } });
      }
    }
  } catch {}
  return NextResponse.json({ ok: true, user: { id: session.sub, role, name: session.name } });
}


