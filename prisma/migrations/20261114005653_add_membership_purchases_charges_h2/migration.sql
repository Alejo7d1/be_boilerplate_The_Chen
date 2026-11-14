-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('VIGENTE', 'VENCIDA');

-- CreateEnum
CREATE TYPE "charge_status" AS ENUM ('PENDIENTE', 'PAGADO', 'ANULADO');

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "status" "membership_status" NOT NULL DEFAULT 'VIGENTE';

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "membership_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "charge_status" NOT NULL DEFAULT 'PENDIENTE',
    "receipt_number" VARCHAR(30),
    "concept" VARCHAR(150),
    "last4" VARCHAR(4),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charges_receipt_number_key" ON "charges"("receipt_number");

-- CreateIndex
CREATE INDEX "charges_user_id_status_idx" ON "charges"("user_id", "status");

-- CreateIndex
CREATE INDEX "charges_created_at_idx" ON "charges"("created_at");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id", "status");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
