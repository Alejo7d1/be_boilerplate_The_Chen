/*
  Warnings:

  - A unique constraint covering the columns `[card_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('MIEMBRO', 'ENTRENADOR', 'RECEPCION_ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "card_number" VARCHAR(30),
ADD COLUMN     "name" VARCHAR(50),
ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'MIEMBRO',
ADD COLUMN     "surname" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "users_card_number_key" ON "users"("card_number");
