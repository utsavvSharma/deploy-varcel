import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from '@/lib/auth';

// Normalize phone number for comparison (removes spaces, dashes, country codes)
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Remove country code variations (91, 0091, etc.)
  // If number starts with 91 and has more than 10 digits, remove the 91
  if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.substring(2);
  }
  // If number starts with 0 (trunk prefix), remove it
  if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = normalized.substring(1);
  }
  
  return normalized;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const assigned = url.searchParams.get("assigned");

    const includeRelations = {
      notes: true,
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    };

    if (assigned === "public") {
      const leads = await prisma.lead.findMany({ 
        where: { public: true }, 
        include: includeRelations, 
        orderBy: { createdAt: 'desc' } 
      });
      return NextResponse.json({ ok: true, leads });
    }

    if (assigned) {
      const leads = await prisma.lead.findMany({ 
        where: { assignedTo: assigned }, 
        include: includeRelations, 
        orderBy: { createdAt: 'desc' } 
      });
      return NextResponse.json({ ok: true, leads });
    }

    const leads = await prisma.lead.findMany({ 
      include: includeRelations, 
      orderBy: { createdAt: 'desc' } 
    });
    return NextResponse.json({ ok: true, leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating lead with data:', body);
    
    // Get current user session
    const session = await getSession();
    const userId = (session?.sub || session?.userId) as string | undefined;
    
    // Check for duplicate phone number if phone is provided
    if (body.phone) {
      const normalizedInputPhone = normalizePhone(body.phone);
      
      // Get all leads with phone numbers
      const allLeads = await prisma.lead.findMany({
        where: {
          phone: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      });
      
      // Check if any existing phone matches the normalized version
      const existingLead = allLeads.find(lead => 
        normalizePhone(lead.phone) === normalizedInputPhone
      );
      
      if (existingLead) {
        return NextResponse.json({ 
          ok: false, 
          error: `A lead with phone number ${existingLead.phone} already exists (${existingLead.name})`,
        }, { status: 400 });
      }
    }
    
    const created = await prisma.lead.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        company: body.company || null,
        country: body.country || null,
        status: body.status || 'NEW',
        priority: body.priority || 'MEDIUM',
        assignedTo: body.assignedTo || null,
        createdBy: userId || null,
        adminComment: body.adminComment || null,
        public: false,
      },
      include: { notes: true }
    });
    
    // Log LEAD_CREATED activity
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId: userId,
          action: 'LEAD_CREATED',
          description: `Created new lead: ${body.name}`,
          metadata: {
            leadId: created.id,
            leadName: body.name,
            company: body.company,
            status: body.status || 'NEW'
          }
        }
      });
    }
    
    console.log('Lead created successfully:', created.id);
    return NextResponse.json({ ok: true, lead: created });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    console.error('Error details:', error.message, error.code);
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to create lead',
      details: error.message 
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ ok: false, message: 'Missing id' }, { status: 400 });

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });

    if (body.addNote) {
      await prisma.note.create({
        data: {
          text: body.addNote.text,
          leadId: id,
          userId: body.addNote.by || 'admin'
        }
      });
      
      // Log NOTE_ADDED activity
      await prisma.activityLog.create({
        data: {
          userId: body.addNote.by || 'admin',
          action: 'NOTE_ADDED',
          description: `Added note to lead: ${existing.name}`,
          metadata: {
            leadId: id,
            leadName: existing.name,
            noteText: body.addNote.text
          }
        }
      });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        email: body.email !== undefined ? body.email : undefined,
        phone: body.phone !== undefined ? body.phone : undefined,
        company: body.company !== undefined ? body.company : undefined,
        country: body.country !== undefined ? body.country : undefined,
        status: body.status !== undefined ? body.status : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        public: body.setPublic !== undefined ? !!body.setPublic : undefined,
        assignedTo: body.assignTo !== undefined ? body.assignTo : undefined,
        followUpDate: body.followUpDate !== undefined ? (body.followUpDate ? new Date(body.followUpDate) : null) : undefined,
        adminComment: body.adminComment !== undefined ? body.adminComment : undefined,
      },
      include: { notes: true }
    });

    // Log activity based on what changed
    const session = await getSession();
    const currentUserId = session?.sub;
    
    if (currentUserId) {
      // Status change
      if (body.status !== undefined && body.status !== existing.status) {
        await prisma.activityLog.create({
          data: {
            userId: currentUserId,
            action: 'STATUS_CHANGED',
            description: `Changed lead status from ${existing.status} to ${body.status}`,
            metadata: {
              leadId: id,
              leadName: existing.name,
              oldStatus: existing.status,
              newStatus: body.status
            }
          }
        });
      }
      
      // Follow-up date set
      if (body.followUpDate !== undefined && body.followUpDate !== existing.followUpDate?.toISOString()) {
        await prisma.activityLog.create({
          data: {
            userId: currentUserId,
            action: 'FOLLOWUP_SET',
            description: `Set follow-up date for lead: ${existing.name}`,
            metadata: {
              leadId: id,
              leadName: existing.name,
              followUpDate: body.followUpDate
            }
          }
        });
      }
      
      // Assignment change
      if (body.assignTo !== undefined && body.assignTo !== existing.assignedTo) {
        await prisma.activityLog.create({
          data: {
            userId: currentUserId,
            action: 'LEAD_ASSIGNED',
            description: `Assigned lead ${existing.name} to team member`,
            metadata: {
              leadId: id,
              leadName: existing.name,
              assignedTo: body.assignTo
            }
          }
        });
      }
      
      // General update (if name, email, phone, company changed)
      if (body.name !== undefined || body.email !== undefined || body.phone !== undefined || body.company !== undefined) {
        await prisma.activityLog.create({
          data: {
            userId: currentUserId,
            action: 'LEAD_UPDATED',
            description: `Updated lead details: ${existing.name}`,
            metadata: {
              leadId: id,
              leadName: existing.name,
              changes: Object.keys(body).filter(k => !['id', 'addNote', 'status', 'followUpDate', 'assignTo'].includes(k))
            }
          }
        });
      }
    }

    return NextResponse.json({ ok: true, lead: updated });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update lead' }, { status: 500 });
  }
}
