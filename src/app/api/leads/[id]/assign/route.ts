import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, context: any) {
  const { id } = await context.params;
  try {
    const { userId } = await req.json();

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    await prisma.lead.update({
      where: { id },
      data: { assignedTo: userId || null, public: false }
    });

    // Log LEAD_ASSIGNED activity
    const session = await getSession();
    const currentUserId = session?.sub;
    if (currentUserId) {
      await prisma.activityLog.create({
        data: {
          userId: currentUserId,
          action: 'LEAD_ASSIGNED',
          description: `Assigned lead ${existing.name} to team member`,
          metadata: {
            leadId: id,
            leadName: existing.name,
            assignedTo: userId
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to assign lead" },
      { status: 500 }
    );
  }
}
