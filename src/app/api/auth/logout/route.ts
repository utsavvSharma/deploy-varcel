import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST() {
  // Close active session if exists
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid')?.value;
    if (sid) {
      const existing = await prisma.userSession.findUnique({ where: { id: sid }, select: { id: true, userId: true, loginAt: true, logoutAt: true } });
      if (existing && !existing.logoutAt) {
        const now = new Date();
        const durationSec = Math.max(0, Math.floor((now.getTime() - new Date(existing.loginAt).getTime()) / 1000));
        await prisma.userSession.update({ where: { id: sid }, data: { logoutAt: now, durationSec } });
        
        // Log LOGOUT activity
        await prisma.activityLog.create({
          data: {
            userId: existing.userId,
            action: 'LOGOUT',
            description: `Logged out`,
            metadata: {
              sessionId: sid,
              sessionDuration: durationSec
            }
          }
        });
      }
    }
  } catch {}

  const res = NextResponse.json({ ok: true });
  res.cookies.set('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
  res.cookies.set('sid', '', { httpOnly: true, expires: new Date(0), path: '/' });
  return res;
}


