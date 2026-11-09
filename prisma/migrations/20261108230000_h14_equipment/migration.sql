-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMINISTRADOR', 'ENTRENADOR', 'MIEMBRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'MIEMBRO';

-- CreateEnum
CREATE TYPE "machine_status" AS ENUM ('OPERATIVA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "machine_status" NOT NULL DEFAULT 'OPERATIVA',
    "reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_status_logs" (
    "id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "previous_status" "machine_status",
    "new_status" "machine_status" NOT NULL,
    "reason" TEXT,
    "changed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machines_name_key" ON "machines"("name");

-- CreateIndex
CREATE INDEX "machines_name_idx" ON "machines"("name");

-- CreateIndex
CREATE INDEX "machine_status_logs_machine_id_created_at_idx"
    ON "machine_status_logs"("machine_id", "created_at");

-- AddConstraint
ALTER TABLE "machines"
    ADD CONSTRAINT "machines_reason_required_for_unavailable_status"
    CHECK ("status" = 'OPERATIVA' OR ("reason" IS NOT NULL AND btrim("reason") <> ''));

-- AddForeignKey
ALTER TABLE "machine_status_logs"
    ADD CONSTRAINT "machine_status_logs_machine_id_fkey"
    FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_status_logs"
    ADD CONSTRAINT "machine_status_logs_changed_by_id_fkey"
    FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
