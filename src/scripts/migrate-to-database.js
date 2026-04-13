const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('🔄 Starting data migration to database...');

    // Read existing data
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const leadsPath = path.join(process.cwd(), 'data', 'leads.json');

    if (!fs.existsSync(usersPath)) {
      console.log('❌ users.json not found. Aborting.');
      return;
    }
    if (!fs.existsSync(leadsPath)) {
      console.log('❌ leads.json not found. Aborting.');
      return;
    }

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

    // Optional: clear existing data (be careful in production)
    console.log('🧹 Clearing existing tables (users, leads, notes)...');
    await prisma.note.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();

    // Migrate users
    console.log('👤 Migrating users...');
    const existingUserIds = new Set();
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username || null,
          email: user.email || null,
          password: user.password,
          name: user.name || user.username || 'User',
          role: (user.role || 'sales').toUpperCase(),
          createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
        },
      });
      existingUserIds.add(user.id);
    }
    console.log(`✅ Migrated ${users.length} users`);

    // Ensure admin exists (needed as fallback author)
    if (!existingUserIds.has('admin')) {
      await prisma.user.create({
        data: {
          id: 'admin',
          username: 'admin',
          email: null,
          password: bcrypt.hashSync('placeholder-admin', 10),
          name: 'Admin',
          role: 'ADMIN',
        },
      });
      existingUserIds.add('admin');
      console.log('ℹ️ Created fallback admin user');
    }

    // Precreate placeholder users for any note authors that don't exist
    const missingAuthorIds = new Set();
    for (const lead of leads) {
      if (Array.isArray(lead.notes)) {
        for (const note of lead.notes) {
          const authorId = note.by;
          if (authorId && !existingUserIds.has(authorId)) {
            missingAuthorIds.add(authorId);
          }
        }
      }
    }

    if (missingAuthorIds.size > 0) {
      console.log(`👥 Creating ${missingAuthorIds.size} placeholder user(s) for note authors...`);
      for (const missingId of missingAuthorIds) {
        await prisma.user.create({
          data: {
            id: missingId,
            username: missingId,
            email: null,
            // hashed placeholder password; not intended for login
            password: bcrypt.hashSync(`placeholder-${missingId}`, 10),
            name: missingId,
            role: 'SALES',
          },
        });
        existingUserIds.add(missingId);
      }
    }

    // Migrate leads and notes
    console.log('📇 Migrating leads and notes...');
    let notesCount = 0;
    for (const lead of leads) {
      await prisma.lead.create({
        data: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company || null,
          status: (lead.status || 'NEW').toUpperCase(),
          priority: (lead.priority || 'MEDIUM').toUpperCase(),
          public: !!lead.public,
          followUpDate: lead.followUpDate ? new Date(lead.followUpDate) : null,
          assignedTo: lead.assignedTo || null,
          createdAt: lead.createdAt ? new Date(lead.createdAt) : undefined,
          updatedAt: lead.updatedAt ? new Date(lead.updatedAt) : undefined,
        },
      });

      if (Array.isArray(lead.notes)) {
        for (const note of lead.notes) {
          const authorId = note.by && existingUserIds.has(note.by) ? note.by : 'admin';
          await prisma.note.create({
            data: {
              text: note.text,
              leadId: lead.id,
              userId: authorId,
              createdAt: new Date(note.date || note.createdAt || Date.now()),
            },
          });
          notesCount += 1;
        }
      }
    }
    console.log(`✅ Migrated ${leads.length} leads and ${notesCount} notes`);

    console.log('🎉 Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
