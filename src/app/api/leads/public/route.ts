import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({ where: { public: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ leads });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch public leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    await prisma.lead.update({ where: { id }, data: { public: true } });
    
    // Log activity when lead is moved to public pool
    const session = await getSession();
    const currentUserId = session?.sub;
    if (currentUserId) {
      await prisma.activityLog.create({
        data: {
          userId: currentUserId,
          action: 'LEAD_UPDATED',
          description: `Moved lead ${existing.name} to public pool`,
          metadata: {
            leadId: id,
            leadName: existing.name,
            action: 'made_public'
          }
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}