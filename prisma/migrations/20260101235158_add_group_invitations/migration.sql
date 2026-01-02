-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "GroupInvitation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupInvitation_invitedEmail_status_idx" ON "GroupInvitation"("invitedEmail", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_groupId_invitedEmail_status_key" ON "GroupInvitation"("groupId", "invitedEmail", "status");

-- AddForeignKey
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
