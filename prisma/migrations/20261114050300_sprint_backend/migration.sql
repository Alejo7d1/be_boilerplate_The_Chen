-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('MIEMBRO', 'ENTRENADOR', 'RECEPCION_ADMIN');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('Agendada', 'Completada', 'Cancelada');

-- CreateEnum
CREATE TYPE "charge_status" AS ENUM ('Pendiente', 'Pagada', 'Anulada');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "card_number" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'MIEMBRO';

-- CreateTable
CREATE TABLE "trainer_slots" (
    "id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_sessions" (
    "id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" "session_status" NOT NULL DEFAULT 'Agendada',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "membership_id" UUID,
    "personal_session_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "charge_status" NOT NULL DEFAULT 'Pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainer_slots_trainer_id_idx" ON "trainer_slots"("trainer_id");

-- CreateIndex
CREATE INDEX "trainer_slots_date_idx" ON "trainer_slots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_slots_trainer_id_date_start_time_key" ON "trainer_slots"("trainer_id", "date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "personal_sessions_slot_id_key" ON "personal_sessions"("slot_id");

-- CreateIndex
CREATE INDEX "personal_sessions_member_id_idx" ON "personal_sessions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "charges_personal_session_id_key" ON "charges"("personal_session_id");

-- CreateIndex
CREATE INDEX "charges_membership_id_idx" ON "charges"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_card_number_key" ON "users"("card_number");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "trainer_slots" ADD CONSTRAINT "trainer_slots_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_sessions" ADD CONSTRAINT "personal_sessions_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "trainer_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_sessions" ADD CONSTRAINT "personal_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_personal_session_id_fkey" FOREIGN KEY ("personal_session_id") REFERENCES "personal_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
