import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupSwagger, type EnvConfig } from '@Config';

const API_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig, true>);

  // Prefijo global de la API: /api/...
  app.setGlobalPrefix(API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta propiedades que no estén en el DTO...
      whitelist: true,
      // ...y además rechaza la request con 400 si vienen de más, en vez de
      // ignorarlas en silencio.
      forbidNonWhitelisted: true,
      // Convierte el payload al tipo del DTO (los query/params llegan string).
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  setupSwagger(app);

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
}

await bootstrap();
