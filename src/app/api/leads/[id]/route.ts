import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request, context: any) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    console.log('PATCH lead:', id, 'body:', body);
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Set convertedAt timestamp when status changes to CONVERTED
      if (body.status === 'CONVERTED' && existing.status !== 'CONVERTED') {
        updateData.convertedAt = new Date();
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.followUpDate !== undefined) updateData.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
    if (body.adminComment !== undefined) updateData.adminComment = body.adminComment;
    if (body.saleAmount !== undefined) {
      // Convert to number/Decimal for Prisma
      updateData.saleAmount = body.saleAmount === null ? null : Number(body.saleAmount);
    }

    console.log('Update data:', updateData);

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData
    });

    console.log('Lead updated successfully:', updated.id);
    return NextResponse.json({ ok: true, lead: updated });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    console.error('Error details:', error.message, error.code);
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: any) {
  const { id } = await context.params;
  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    await prisma.note.deleteMany({ where: { leadId: id } });
    await prisma.lead.delete({ where: { id } });
    
    // Log LEAD_DELETED activity
    const session = await getSession();
    const currentUserId = session?.sub;
    if (currentUserId && lead) {
      await prisma.activityLog.create({
        data: {
          userId: currentUserId,
          action: 'LEAD_DELETED',
          description: `Deleted lead: ${lead.name}`,
          metadata: {
            leadName: lead.name,
            company: lead.company,
            status: lead.status
          }
        }
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
