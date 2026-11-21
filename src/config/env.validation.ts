/**
 * Validación de variables de entorno.
 *
 * Se ejecuta durante el arranque de ConfigModule: si falta algo o tiene un
 * valor inválido, la aplicación falla de inmediato con un mensaje claro en
 * lugar de reventar más tarde con un error críptico en la primera request.
 */

export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN_DAYS: number;
  BCRYPT_SALT_ROUNDS: number;
  NOTIFICATIONS_URL: string;
}

const requiredVars = ['DATABASE_URL', 'JWT_SECRET'] as const;

/**
 * Lee una variable como string. process.env siempre entrega strings, pero el
 * objeto llega tipado como `unknown`, así que se valida en vez de castear.
 */
function readString(
  raw: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;

  if (typeof value !== 'string') {
    throw new Error(`La variable de entorno ${key} debe ser un string.`);
  }
  return value;
}

function readInt(
  raw: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `La variable de entorno ${key} debe ser un entero positivo.`,
    );
  }
  return parsed;
}

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const missing = requiredVars.filter((key) => !raw[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
        'Copiá .env.example a .env y completalas.',
    );
  }

  const jwtSecret = readString(raw, 'JWT_SECRET', '');
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET debe tener al menos 32 caracteres. Generá uno con: openssl rand -base64 32',
    );
  }

  const nodeEnv = readString(raw, 'NODE_ENV', 'development');
  const databaseUrl = readString(raw, 'DATABASE_URL', '');

  if (nodeEnv !== 'test') {
    let parsedDatabaseUrl: URL;
    try {
      parsedDatabaseUrl = new URL(databaseUrl);
    } catch {
      throw new Error('DATABASE_URL debe ser una URL PostgreSQL válida.');
    }

    const databaseName = parsedDatabaseUrl.pathname.replace(/^\/+/, '');
    // La base de pruebas no sirve como base de desarrollo: los e2e la llenan
    // y la truncan. Se detecta por nombre y no por puerto, porque el compose
    // de pruebas publica desarrollo y test en el mismo 5433.
    if (databaseName.includes('_test') || databaseName.endsWith('-test')) {
      throw new Error(
        `DATABASE_URL apunta a la base de pruebas ("${databaseName}"). ` +
          'Configurá la base de desarrollo (por ejemplo si_be_boilerplate_dev).',
      );
    }
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: readInt(raw, 'PORT', 7758),
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: readString(raw, 'JWT_EXPIRES_IN', '15m'),
    REFRESH_TOKEN_EXPIRES_IN_DAYS: readInt(
      raw,
      'REFRESH_TOKEN_EXPIRES_IN_DAYS',
      7,
    ),
    BCRYPT_SALT_ROUNDS: readInt(raw, 'BCRYPT_SALT_ROUNDS', 12),
    NOTIFICATIONS_URL: readString(
      raw,
      'NOTIFICATIONS_URL',
      'http://localhost:7758/api/notifications/send',
    ),
  };
}
