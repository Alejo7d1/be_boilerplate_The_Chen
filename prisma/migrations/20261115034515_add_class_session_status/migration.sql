-- CreateEnum
CREATE TYPE "session_state" AS ENUM ('programada', 'cancelada', 'finalizada');

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "cancellation_reason" VARCHAR(255),
ADD COLUMN     "status" "session_state" NOT NULL DEFAULT 'programada';

-- CreateIndex
CREATE INDEX "class_sessions_trainer_id_date_idx" ON "class_sessions"("trainer_id", "date");
