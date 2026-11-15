import 'dotenv/config';
import { Client } from 'pg';

/**
 * Crea la base declarada en DATABASE_URL si todavía no existe.
 *
 * `prisma migrate deploy` asume que la base ya existe, así que este paso hace
 * que el setup local sea un solo comando. Se conecta a la base de
 * mantenimiento `postgres`, que siempre está disponible en una instalación
 * estándar.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. Copiá .env.example a .env y completala.',
  );
}

const url = new URL(connectionString);
const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
if (!database) {
  throw new Error(
    `DATABASE_URL no incluye el nombre de la base: ${connectionString}`,
  );
}

const maintenanceUrl = new URL(url.toString());
maintenanceUrl.pathname = '/postgres';
// `schema` es una opción de Prisma, no de PostgreSQL.
maintenanceUrl.searchParams.delete('schema');

const client = new Client({ connectionString: maintenanceUrl.toString() });

try {
  await client.connect();

  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [database],
  );

  if (rowCount) {
    console.log(`La base "${database}" ya existe, no se toca.`);
  } else {
    const quoted = `"${database.replace(/"/g, '""')}"`;
    await client.query(`CREATE DATABASE ${quoted}`);
    console.log(`Base "${database}" creada.`);
  }
} finally {
  await client.end();
}
