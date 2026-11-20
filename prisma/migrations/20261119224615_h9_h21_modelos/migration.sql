/*
  Warnings:

  - A unique constraint covering the columns `[renewed_from_id]` on the table `memberships` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "access_result" AS ENUM ('Permitido', 'Excepcion', 'Denegado');

-- CreateEnum
CREATE TYPE "machine_status" AS ENUM ('OPERATIVA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "review_target_type" AS ENUM ('CLASE', 'SESION_PERSONAL');

-- CreateEnum
CREATE TYPE "notification_source" AS ENUM ('MEMBRESIA', 'CLASES', 'PAGOS', 'EQUIPAMIENTO');

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "renewed_from_id" UUID;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "attended_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "result" "access_result" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registered_by_id" UUID,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "receipt_seq" SERIAL NOT NULL,
    "receipt_number" VARCHAR(12) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "exp_month" INTEGER NOT NULL,
    "exp_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "routine_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "series" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_records" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weight" DECIMAL(4,1) NOT NULL,
    "waist" DECIMAL(4,1) NOT NULL,
    "chest" DECIMAL(4,1) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strength_marks" (
    "id" UUID NOT NULL,
    "progress_record_id" UUID NOT NULL,
    "exercise_name" VARCHAR(50) NOT NULL,
    "weight_lifted" DECIMAL(4,1) NOT NULL,
    "repetitions" INTEGER NOT NULL,

    CONSTRAINT "strength_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" VARCHAR(50),
    "status" "machine_status" NOT NULL DEFAULT 'OPERATIVA',
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_status_logs" (
    "id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "previous_status" "machine_status",
    "new_status" "machine_status" NOT NULL,
    "reason" VARCHAR(255),
    "changed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "target_type" "review_target_type" NOT NULL,
    "member_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "source_module" "notification_source" NOT NULL,
    "reference_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_logs_member_id_timestamp_idx" ON "access_logs"("member_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "payments_charge_id_key" ON "payments"("charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_seq_key" ON "payments"("receipt_seq");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "routines_member_id_key" ON "routines"("member_id");

-- CreateIndex
CREATE INDEX "routines_trainer_id_idx" ON "routines"("trainer_id");

-- CreateIndex
CREATE INDEX "exercises_routine_id_idx" ON "exercises"("routine_id");

-- CreateIndex
CREATE INDEX "progress_records_member_id_date_idx" ON "progress_records"("member_id", "date");

-- CreateIndex
CREATE INDEX "strength_marks_progress_record_id_idx" ON "strength_marks"("progress_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "machines_name_key" ON "machines"("name");

-- CreateIndex
CREATE INDEX "machines_status_name_idx" ON "machines"("status", "name");

-- CreateIndex
CREATE INDEX "machine_status_logs_machine_id_created_at_idx" ON "machine_status_logs"("machine_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_session_id_idx" ON "reviews"("session_id");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

-- CreateIndex
CREATE INDEX "reviews_session_id_created_at_idx" ON "reviews"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_trainer_id_created_at_idx" ON "reviews"("trainer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_member_id_session_id_key" ON "reviews"("member_id", "session_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "charges_status_created_at_idx" ON "charges"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "charges_status_paid_at_idx" ON "charges"("status", "paid_at");

-- CreateIndex
CREATE INDEX "class_sessions_status_starts_at_idx" ON "class_sessions"("status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_renewed_from_id_key" ON "memberships"("renewed_from_id");

-- CreateIndex
CREATE INDEX "memberships_end_date_idx" ON "memberships"("end_date");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_renewed_from_id_fkey" FOREIGN KEY ("renewed_from_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_marks" ADD CONSTRAINT "strength_marks_progress_record_id_fkey" FOREIGN KEY ("progress_record_id") REFERENCES "progress_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_status_logs" ADD CONSTRAINT "machine_status_logs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_status_logs" ADD CONSTRAINT "machine_status_logs_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- H16/H17: la calificación debe estar entre 1 y 5
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

-- H14/H15: una máquina que no está operativa debe tener motivo
ALTER TABLE "machines"
  ADD CONSTRAINT "machines_reason_required_check"
  CHECK ("status" = 'OPERATIVA' OR ("reason" IS NOT NULL AND length(btrim("reason")) > 0));

-- H15: la bitácora de estados es inmutable (solo INSERT)
CREATE OR REPLACE FUNCTION prevent_machine_status_logs_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'machine_status_logs es inmutable: % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER machine_status_logs_immutable
  BEFORE UPDATE OR DELETE ON "machine_status_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_machine_status_logs_mutation();
