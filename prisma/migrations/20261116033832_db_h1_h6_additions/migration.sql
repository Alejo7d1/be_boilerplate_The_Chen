/*
  Warnings:

  - A unique constraint covering the columns `[receipt_number]` on the table `charges` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('VIGENTE', 'VENCIDA');

-- AlterTable
ALTER TABLE "charges" ADD COLUMN     "concept" VARCHAR(150),
ADD COLUMN     "last4" VARCHAR(4),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "plan_id" UUID,
ADD COLUMN     "receipt_number" VARCHAR(30),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "cancellation_reason" VARCHAR(255),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "status" "membership_status" NOT NULL DEFAULT 'VIGENTE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "cancellation_reason" VARCHAR(255),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "surname" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "charges_receipt_number_key" ON "charges"("receipt_number");

-- CreateIndex
CREATE INDEX "charges_user_id_status_idx" ON "charges"("user_id", "status");

-- CreateIndex
CREATE INDEX "charges_created_at_idx" ON "charges"("created_at");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id", "status");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
