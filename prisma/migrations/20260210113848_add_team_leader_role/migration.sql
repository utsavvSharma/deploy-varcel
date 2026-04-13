-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'ROLE_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'TEAM_MEMBER_ASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE 'TEAM_MEMBER_REMOVED';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEAM_LEADER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "teamLeaderId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
