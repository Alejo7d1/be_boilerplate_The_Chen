-- H12: la UI permite nombres de ejercicio de hasta 100 caracteres.
ALTER TABLE "exercises" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);
