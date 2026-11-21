import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';

const DOCS_PATH = 'api/docs';

const DESCRIPTION = `
API del centro **The Chen** para gestionar membresías, planes, clases, reservas
y disponibilidad de entrenadores.

### Autenticación

1. Ejecutá \`POST /auth/login\` con un email y contraseña válidos.
2. Copiá el \`accessToken\` de la respuesta.
3. Usá el botón **Authorize** y pegá el token (sin el prefijo \`Bearer\`).
4. El token se conserva entre recargas del navegador.

Los endpoints marcados con candado requieren \`Authorization: Bearer <token>\`.
Los que no lo tienen son públicos (health, login, refresh, logout y registro).

### Roles

| Rol | Alcance |
|---|---|
| \`MIEMBRO\` | Consulta su membresía, sus reservas, paga cobros, agenda sesiones personales, registra progreso y califica clases |
| \`ENTRENADOR\` | Gestiona sus bloques de disponibilidad, asigna rutinas y consulta el padrón de miembros |
| \`RECEPCION_ADMIN\` | Administra planes, compras/renovaciones, clases, cobros, accesos, equipos y reportes |

### Códigos de error

Los errores usan el esquema \`ErrorResponseDto\`: \`400\` validación/regla de negocio,
\`401\` token ausente o inválido, \`403\` rol o membresía inválidos, \`404\` recurso
inexistente o ajeno, \`409\` conflicto (duplicado, solapamiento, cupo agotado).
`.trim();

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('The Chen — API de membresías y clases')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .setContact(
      'Equipo The Chen',
      'https://github.com/Alejo7d1/be_boilerplate_The_Chen',
      'equipo@thechen.test',
    )
    .setExternalDoc(
      'Repositorio en GitHub',
      'https://github.com/Alejo7d1/be_boilerplate_The_Chen',
    )
    // El prefijo global se ignora al armar los paths y se declara como server:
    // así Swagger UI arma /api/<ruta> sin duplicar el prefijo.
    .addServer('/api', 'API local')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access token JWT devuelto por POST /auth/login. Pegalo sin el prefijo "Bearer ".',
      },
      'bearer',
    )
    .addTag('health', 'Estado del servicio y conectividad.')
    .addTag('auth', 'Login, refresh, logout y usuario autenticado.')
    .addTag('users', 'Registro público y padrón de miembros para recepción.')
    .addTag(
      'memberships',
      'Consulta, compra y renovación de membresías (H1/H2).',
    )
    .addTag('plans', 'Listado y administración de planes (H3).')
    .addTag('class-sessions', 'Consulta de clases y reserva de cupos (H4).')
    .addTag('classes', 'Programación, edición y cancelación de clases (H6).')
    .addTag(
      'reservations',
      'Reservas propias y cancelación con anticipación (H5).',
    )
    .addTag('trainers', 'Entrenadores activos y su disponibilidad (H7/H8).')
    .addTag(
      'trainer-availability',
      'Bloques de disponibilidad de 60 minutos (H7).',
    )
    .addTag('personal-sessions', 'Agendamiento de sesiones personales (H8).')
    .addTag('access', 'Registro de ingresos por carné (H9).')
    .addTag('charges', 'Cobros pendientes para recepción (H11).')
    .addTag('payments', 'Pago de cobros y comprobantes (H10).')
    .addTag('routines', 'Rutinas de ejercicios (H12).')
    .addTag('progress', 'Progreso físico y marcas de fuerza (H13).')
    .addTag('equipment', 'Inventario de máquinas y bitácora de estados (H14/H15).')
    .addTag('reviews', 'Reseñas de clases y promedios (H16/H17).')
    .addTag('notifications', 'Bandeja de notificaciones del usuario (H18/H19).')
    .addTag('reports', 'Reportes de ocupación e ingresos (H20/H21).')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
    extraModels: [ErrorResponseDto],
  });

  SwaggerModule.setup(DOCS_PATH, app, document, {
    customSiteTitle: 'The Chen API — Swagger',
    jsonDocumentUrl: 'api/docs-json',
    yamlDocumentUrl: 'api/docs-yaml',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      tryItOutEnabled: true,
    },
  });
}
