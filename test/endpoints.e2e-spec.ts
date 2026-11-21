// Verifica que las rutas del contrato estén realmente publicadas.
//
// No toca la base: reemplaza PrismaService por un doble, así que solo comprueba
// el registro de rutas y la autorización global (un endpoint inexistente
// responde 404; uno protegido responde 401).
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { setupSwagger } from '../src/config/swagger.config.js';
import { PrismaService } from '../src/prisma/services/index.js';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5433/si_be_boilerplate_test?schema=public';
process.env.JWT_SECRET ??= 'test-only-secret-0123456789abcdefghijklmnop';

const ROUTES: { method: 'get' | 'post'; path: string }[] = [
  { method: 'post', path: '/api/access/check-in' },
  { method: 'get', path: '/api/charges/pending' },
  { method: 'post', path: '/api/payments/process' },
  { method: 'post', path: '/api/routines' },
  { method: 'post', path: '/api/progress' },
  { method: 'get', path: '/api/progress' },
  { method: 'post', path: '/api/reviews' },
  { method: 'get', path: '/api/reviews/analytics' },
  { method: 'get', path: '/api/reports/occupancy' },
  { method: 'get', path: '/api/reports/financial' },
  { method: 'post', path: '/api/notifications/send' },
];

describe('Rutas del contrato publicadas', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    setupSwagger(app);
    await app.init();
  });

  it.each(ROUTES)('$method $path existe y exige token', async ({ method, path }) => {
    const response = await request(app.getHttpServer())[method](path);
    expect(response.status).toBe(401);
  });

  it('documenta las rutas en OpenAPI', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const paths = Object.keys(res.body.paths as Record<string, unknown>);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/access/check-in',
        '/charges/pending',
        '/payments/process',
        '/routines',
        '/progress',
        '/reviews',
        '/reviews/analytics',
        '/reports/occupancy',
        '/reports/financial',
        '/notifications/send',
      ]),
    );

    const operations = Object.values(
      res.body.paths as Record<string, Record<string, unknown>>,
    ).flatMap((path) => Object.values(path));
    expect(operations).toHaveLength(40);

    // El despacho manual se documenta con cuerpo y sus errores de rol.
    const send = res.body.paths['/notifications/send'].post as {
      requestBody?: { content?: Record<string, { schema?: { $ref?: string } }> };
      responses: Record<string, unknown>;
      security?: unknown;
    };
    expect(send.requestBody?.content?.['application/json']).toBeDefined();
    expect(send.responses['201']).toBeDefined();
    expect(send.responses['403']).toBeDefined();
    expect(send.security).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
