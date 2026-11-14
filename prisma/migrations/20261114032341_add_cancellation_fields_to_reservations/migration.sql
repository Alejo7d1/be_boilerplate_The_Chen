-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "cancellation_reason" VARCHAR(255);
