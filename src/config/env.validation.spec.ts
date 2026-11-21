import { validateEnv } from '@Config';

const JWT_SECRET = 'x'.repeat(32);
const devUrl = (db: string, port = 5433) =>
  `postgresql://postgres:postgres@localhost:${port}/${db}?schema=public`;

describe('validateEnv', () => {
  it('acepta la base de desarrollo aunque esté publicada en el 5433 del compose de pruebas', () => {
    const env = validateEnv({
      DATABASE_URL: devUrl('si_be_boilerplate_dev'),
      JWT_SECRET,
    });

    expect(env.DATABASE_URL).toContain('si_be_boilerplate_dev');
    expect(env.PORT).toBe(7758);
  });

  it('rechaza la base de pruebas como base de desarrollo', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: devUrl('si_be_boilerplate_test'),
        JWT_SECRET,
      }),
    ).toThrow(/base de pruebas/);
  });

  it('rechaza nombres de base terminados en -test', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: devUrl('boilerplate-test'), JWT_SECRET }),
    ).toThrow(/base de pruebas/);
  });

  it('con NODE_ENV=test acepta la base de pruebas', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'test',
        DATABASE_URL: devUrl('si_be_boilerplate_test'),
        JWT_SECRET,
      }),
    ).not.toThrow();
  });

  it('rechaza un JWT_SECRET demasiado corto', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: devUrl('si_be_boilerplate_dev'),
        JWT_SECRET: 'corto',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('falla si faltan variables obligatorias', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
