# Contratos de API

Fuente de verdad de endpoints y roles: [`lib/api-routes.ts`](../lib/api-routes.ts) junto con la tabla de endpoints de este documento. Las rutas de backend **no** se escriben a mano en acciones, páginas ni componentes.

Para el detalle de integración que necesita el equipo de backend (request/response por ruta, campos
obligatorios, códigos de estado y huecos de contrato), ver [`docs/backend-routes.md`](./backend-routes.md).

## Rutas de páginas

Las páginas usan nombres en inglés ([`decisiones.md`](../decisiones.md)). Las rutas descritas en Jira estaban en español, por lo que se tradujeron:

| Historia | Módulo | Ruta de página | Rol |
| --- | --- | --- | --- |
| H1 | Consulta del estado de membresía | `/membership` | `MIEMBRO` |
| H2 | Compra o renovación de membresía | `/membership/purchase` | `RECEPCION_ADMIN` |
| H3 | Administración de planes | `/admin/plans` | `RECEPCION_ADMIN` |
| — | Alta y padrón de miembros (fuera de H1-H8) | `/admin/members` | `RECEPCION_ADMIN` |
| H4 | Reserva de cupo en una clase | `/classes/book` | `MIEMBRO` |
| H5 | Cancelación de reserva | `/my-reservations` | `MIEMBRO` |
| H6 | Definición, edición y cancelación de clases | `/admin/classes` | `RECEPCION_ADMIN` |
| H7 | Bloques de disponibilidad del entrenador | `/trainer/availability` | `ENTRENADOR` |
| H8 | Agendamiento de sesión personal | `/trainers/book` | `MIEMBRO` |

La navegación se define en [`lib/navigation.ts`](../lib/navigation.ts). Una entrada con `available: false` se muestra deshabilitada con la etiqueta «Pronto» hasta que su historia se implemente.

## Endpoints por módulo

| Módulo | Método | Ruta | Roles |
| --- | --- | --- | --- |
| Autenticación | `POST` | `/api/auth/login` | Público |
| Autenticación | `POST` | `/api/users` | Público en el backend; la UI lo expone como «Nuevo miembro» solo a `RECEPCION_ADMIN` |
| Membresías | `GET` | `/api/memberships/me` | `MIEMBRO` |
| Membresías | `POST` | `/api/memberships/purchase` | `RECEPCION_ADMIN` |
| Miembros | `GET` | `/api/users?role=MIEMBRO&search=<texto>` | `RECEPCION_ADMIN` |
| Planes | `GET` | `/api/plans` | Autenticados |
| Planes | `POST` | `/api/plans` | `RECEPCION_ADMIN` |
| Planes | `PUT` | `/api/plans/:id` | `RECEPCION_ADMIN` |
| Planes | `PATCH` | `/api/plans/:id/status` | `RECEPCION_ADMIN` |
| Clases | `GET` | `/api/class-sessions` | Autenticados |
| Clases | `POST` | `/api/classes` | `RECEPCION_ADMIN` |
| Clases | `PUT` | `/api/classes/:id` | `RECEPCION_ADMIN` |
| Clases | `PATCH` | `/api/classes/:id/cancel` | `RECEPCION_ADMIN` |
| Clases | `POST` | `/api/class-sessions/:id/reserve` | `MIEMBRO` |
| Reservas | `GET` | `/api/reservations/me` | `MIEMBRO` |
| Reservas | `DELETE` | `/api/reservations/:id` | `MIEMBRO` |
| Entrenadores | `GET` | `/api/trainers` | Autenticados |
| Entrenadores | `GET` | `/api/trainers/:id/availability` | Autenticados |
| Entrenadores | `POST` | `/api/trainer-availability` | `ENTRENADOR` |
| Entrenadores | `DELETE` | `/api/trainer-availability/:id` | `ENTRENADOR` |
| Entrenadores | `POST` | `/api/personal-sessions` | `MIEMBRO` |
| Pagos | `GET` | `/api/charges/pending` | `RECEPCION_ADMIN` |
| Pagos | `POST` | `/api/payments/process` | `MIEMBRO` |

## Tipos compartidos

| Módulo | Archivo |
| --- | --- |
| Primitivas (`EntityId`, `IsoDate`, `IsoTime`, `ApiErrorBody`) | [`lib/types/common.ts`](../lib/types/common.ts) |
| Membresías | [`lib/types/memberships.ts`](../lib/types/memberships.ts) |
| Miembros (selector de compra) | [`lib/types/members.ts`](../lib/types/members.ts) |
| Planes | [`lib/types/plans.ts`](../lib/types/plans.ts) |
| Clases y reservas | [`lib/types/classes.ts`](../lib/types/classes.ts) |
| Entrenadores y disponibilidad | [`lib/types/trainers.ts`](../lib/types/trainers.ts) |
| Pagos | [`lib/types/payments.ts`](../lib/types/payments.ts) |

## Capa de adaptadores (Fases 1, 2 y 3)

Las páginas y las Server Actions **no** llaman a `apiFetch` directamente: lo hacen a través de
[`lib/api/`](../lib/api), un módulo por dominio (`memberships`, `plans`, `classes`, `reservations`,
`members`, `trainers`).

- Cada módulo normaliza la respuesta con los helpers de [`lib/api/normalize.ts`](../lib/api/normalize.ts),
  que aceptan nombres de campo alternativos (`expiresAt` / `endDate`, `startTime` / `horaInicio`, etc.)
  y envuelven listados (`items`, `data`, `results`, `content`).
- Si falta un campo obligatorio se lanza `ContractError`: la pantalla muestra «El backend devolvió un
  formato inesperado» y el detalle queda en la consola del servidor. **Nunca se rellena con valores por defecto.**
- Un cambio de contrato se resuelve editando un solo archivo de `lib/api/`.
- `apiFetch` devuelve `undefined` en respuestas `204` o sin cuerpo (necesario para `DELETE /api/reservations/:id`).

## Guards de rol

- Páginas: `requireRole(["ROL"])` en [`lib/auth-guard.ts`](../lib/auth-guard.ts) redirige a `/login` sin
  sesión y a `/` si el rol del JWT no está autorizado.
- Server Actions: `hasAnyRole` valida el rol dentro de cada mutación, porque las acciones son alcanzables
  por POST directo.
- El backend sigue siendo la autoridad de autorización; el guard es solo de UI.

## Contrato confirmado con el backend de pruebas

Verificado contra `API de pruebas` (`http://localhost:8000`). Estas son las respuestas reales que consumen los adaptadores de `lib/api/`.

| Endpoint | Respuesta |
| --- | --- |
| `GET /api/memberships/me` | `{ id, memberId, planId, planName, status, endDate, remainingClasses }`. Sin membresía: `{ id: null, status: "Sin Membresía", planId: null, planName: null, endDate: null, remainingClasses: null }` → se representa como `null` y la pantalla muestra el estado vacío. |
| `POST /api/memberships/purchase` | `201 { membershipId, chargeId, newEndDate, status }` |
| `GET /api/plans` | `{ data: [{ id, name, type, price, durationDays, classCount, benefits, active }] }` |
| `POST /api/plans` · `PUT /api/plans/:id` | Aceptan `{ name, price, durationDays, classesIncluded }` y los persisten como `durationDays` / `classCount`. |
| `PATCH /api/plans/:id/status` | Recibe `{ active: boolean }` (también acepta `{ status: string }`). |
| `GET /api/users?role=&search=` | `{ data: [{ id, email, role, name, cardNumber }] }` · solo `RECEPCION_ADMIN` |
| `POST /api/users` | `201 { id, email, role, name, cardNumber }`; `409` si el correo ya existe. Crea siempre rol `MIEMBRO` y genera el carné. |
| `GET /api/class-sessions` | `{ data: [{ id, name, trainerId, trainerName, date, startTime, durationMinutes, maxCapacity, reservedCount, availableSpots, status }] }` |
| `POST /api/class-sessions/:id/reserve` | `201 { reservationId, status, message }`; `403` membresía vencida; `409` cupo agotado o reserva duplicada. |
| `GET /api/reservations/me` | `{ data: [{ id, classId, name, date, startTime, status, cancelledAt }] }` |
| `DELETE /api/reservations/:id` | `200 { reservationId, status, message }`; `404` si no existe o no es del miembro; `409` si ya estaba cancelada. |
| `GET /api/trainers` | `{ data: [{ id, email, role, name, cardNumber }] }` |

Estados observados: membresía `Vigente` / `Vencida` / `Sin Membresía`; clase `Programada` / `Cancelada` / `Finalizada`; reserva `Activa` / `Cancelada`. La cubeta de clases de la reserva se calcula con `availableSpots`.

### Correcciones aplicadas al backend de pruebas

1. Las reservas ahora viven en un registro propio con `id`. Antes `GET /api/reservations/me` no devolvía identificador y `DELETE /api/reservations/:id` respondía `200` **sin cancelar nada** (la historia H5 no era funcional).
2. `DELETE /api/reservations/:id` valida propiedad (`404`) y estado (`409`), y descuenta el cupo.
3. `GET /api/class-sessions` incluye `trainerName` y los cupos calculados (`reservedCount`, `availableSpots`), en lugar de exponer el array interno de reservas.
4. Nuevo `GET /api/users` (solo `RECEPCION_ADMIN`) con filtros `role` y `search`, necesario para la compra de H2.
5. `PATCH /api/plans/:id/status` interpreta `{ active }`; antes ignoraba el cuerpo y dejaba el plan siempre activo.
6. `POST`/`PUT /api/plans` normalizan `durationDays` y `classesIncluded` al esquema interno.
7. Los datos de ejemplo usan fechas relativas para que las clases caigan dentro de los próximos 7 días.

## Estado de la autenticación

El rol del sidebar se lee del claim `role` del JWT mediante [`getSessionData`](../lib/session.ts). Si el token no incluye ese claim, el sidebar queda vacío con un aviso y no se asume ningún rol.
