// Verifica que la documentación OpenAPI se genere y exponga todos los endpoints.
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { setupSwagger } from '../src/config/swagger.config.js';

describe('Documentación Swagger', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    setupSwagger(app);
    await app.init();
  });

  it('publica la UI, el JSON y el YAML', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    await request(app.getHttpServer()).get('/api/docs-yaml').expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(res.body.info.title).toContain('The Chen');
    expect(res.body.info.version).toBe('1.0.0');
    expect(res.body.servers).toContainEqual({
      url: '/api',
      description: 'API local',
    });
    expect(res.body.components.securitySchemes.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(res.body.components.schemas.ErrorResponseDto).toBeDefined();
  });

  it('documenta todos los endpoints con descripción, tags y respuestas', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const operations = Object.values(
      res.body.paths as Record<string, Record<string, unknown>>,
    ).flatMap((path) => Object.values(path));

    expect(operations).toHaveLength(25);
    for (const operation of operations as Array<{
      description?: string;
      tags?: string[];
      responses?: Record<string, unknown>;
      security?: unknown;
    }>) {
      expect(operation.description, JSON.stringify(operation)).toBeTruthy();
      expect(operation.tags?.length).toBeGreaterThan(0);
      expect(operation.responses).toBeTruthy();
      if (operation.security) {
        expect(operation.responses?.['401']).toBeDefined();
      }
    }

    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/plans',
        '/memberships/me',
        '/reservations/me',
        '/classes',
        '/trainer-availability',
        '/personal-sessions',
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
