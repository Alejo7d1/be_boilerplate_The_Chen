# Rutas del backend requeridas por el frontend

Documento de integración para el equipo de backend. Describe **todas** las rutas que el frontend
consume hoy, el contrato exacto que espera de cada una (campos obligatorios y opcionales), los
códigos de estado que interpreta y los huecos de contrato detectados.

Fuente de verdad de las rutas: [`lib/api-routes.ts`](../lib/api-routes.ts).
Contratos por dominio: [`lib/api/`](../lib/api). Tipos: [`lib/types/`](../lib/types).

---

## 1. Cómo consume el frontend

| Aspecto | Comportamiento del frontend |
| --- | --- |
| Base URL | Variable de entorno `API_URL` (ej. `http://localhost:8000`). Las rutas se resuelven contra esa base: `API_URL + /api/...` |
| Origen de las llamadas | **Siempre desde el servidor de Next.js** (Server Components y Server Actions). El navegador nunca llama al backend directamente → **CORS no es necesario** |
| Autenticación | `Authorization: Bearer <JWT>` en todas las llamadas salvo `POST /api/auth/login` |
| `Content-Type` | `application/json` en **todas** las peticiones (incluye `GET` y `DELETE` sin cuerpo) |
| Cache | `no-store` (toda lectura va al backend) |
| Cuerpo vacío | `204` o `200` con cuerpo vacío se tratan como “sin datos” (`undefined`), no como error |
| Error | Se lee `message`, `error` o `detail` (en ese orden) del cuerpo JSON. Si no hay texto → se muestra una copy por código de estado |
| Listados | Se acepta un array plano o envuelto en `items` / `data` / `results` / `content` / `records` / `list` |
| Campo faltante | Si un campo **obligatorio** no llega, el front lanza `ContractError` y muestra “El backend devolvió un formato inesperado”. **No inventa valores** |

### Formato de error esperado

```json
{ "error": "Carné no encontrado" }
```

Cualquiera de estas claves es válida: `error`, `message`, `detail` (string no vacío).

### Códigos de estado que cambian la UI

| Código | Interpretación en la interfaz |
| --- | --- |
| `401` | “Tu sesión expiró. Vuelve a iniciar sesión.” |
| `403` | Permiso o membresía no vigente (en check-in habilita el switch “Autorizar por Excepción”) |
| `404` | “El recurso ya no está disponible” (en `GET /api/progress` se interpreta como **sin historial**) |
| `409` | Conflicto de estado (cupo agotado, reserva duplicada, pago ya registrado) |
| `400` | “Los datos enviados no son válidos” |

### Roles del sistema

`MIEMBRO` · `ENTRENADOR` · `RECEPCION_ADMIN` (grafía exacta, sensible a mayúsculas).

El rol se lee del **claim `role`** del JWT. El `exp` (segundos) también se valida en el front: si está
vencido se trata como sesión inexistente.

---

## 2. Tabla maestra de rutas

| # | Método | Ruta | Rol esperado en backend | Consumido por |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/auth/login` | Público | [`app/actions/auth.ts`](../app/actions/auth.ts) |
| 2 | `POST` | `/api/users` | Público en backend · UI solo `RECEPCION_ADMIN` | [`lib/api/members.ts`](../lib/api/members.ts) |
| 3 | `GET` | `/api/users?role=MIEMBRO&search=<texto>` | `RECEPCION_ADMIN` | miembros, pagos, rutinas |
| 4 | `GET` | `/api/memberships/me` | `MIEMBRO` | membresía, dashboard |
| 5 | `POST` | `/api/memberships/purchase` | `RECEPCION_ADMIN` | compra de membresía |
| 6 | `GET` | `/api/plans` | Autenticados | planes, compra, dashboard |
| 7 | `POST` | `/api/plans` | `RECEPCION_ADMIN` | administración de planes |
| 8 | `PUT` | `/api/plans/:id` | `RECEPCION_ADMIN` | administración de planes |
| 9 | `PATCH` | `/api/plans/:id/status` | `RECEPCION_ADMIN` | administración de planes |
| 10 | `GET` | `/api/class-sessions` | Autenticados | clases, dashboard, reportes |
| 11 | `POST` | `/api/classes` | `RECEPCION_ADMIN` | administración de clases |
| 12 | `PUT` | `/api/classes/:id` | `RECEPCION_ADMIN` | administración de clases |
| 13 | `PATCH` | `/api/classes/:id/cancel` | `RECEPCION_ADMIN` | administración de clases |
| 14 | `POST` | `/api/class-sessions/:id/reserve` | `MIEMBRO` | reserva de cupo |
| 15 | `GET` | `/api/reservations/me` | `MIEMBRO` | mis reservas, reseñas, dashboard |
| 16 | `DELETE` | `/api/reservations/:id` | `MIEMBRO` | mis reservas |
| 17 | `GET` | `/api/trainers` | Autenticados | clases, agendar sesión, reportes |
| 18 | `GET` | `/api/trainers/:id/availability` | Autenticados | disponibilidad, agendar sesión |
| 19 | `POST` | `/api/trainer-availability` | `ENTRENADOR` | disponibilidad |
| 20 | `DELETE` | `/api/trainer-availability/:id` | `ENTRENADOR` | disponibilidad |
| 21 | `POST` | `/api/personal-sessions` | `MIEMBRO` | agendar sesión |
| 22 | `POST` | `/api/access/check-in` | `RECEPCION_ADMIN` | check-in |
| 23 | `GET` | `/api/charges/pending` | `RECEPCION_ADMIN` | cobros pendientes |
| 24 | `POST` | `/api/payments/process` | `MIEMBRO` | pago |
| 25 | `POST` | `/api/routines` | `ENTRENADOR` | rutinas |
| 26 | `POST` | `/api/progress` | `MIEMBRO` | registro de progreso |
| 27 | `GET` | `/api/progress` | `MIEMBRO` | **historial de progreso (no publicado)** |
| 28 | `POST` | `/api/reviews` | `MIEMBRO` | reseñas |
| 29 | `GET` | `/api/reviews/analytics` | `RECEPCION_ADMIN` | reporte de reseñas |
| 30 | `GET` | `/api/reports/occupancy` | `RECEPCION_ADMIN` | reporte de ocupación |
| 31 | `GET` | `/api/reports/financial` | `RECEPCION_ADMIN` | reporte financiero |
| 32 | `GET` | `/api/equipment` | Autenticados | inventario y administración |
| 33 | `PATCH` | `/api/equipment/:id/status` | `RECEPCION_ADMIN` | administración de equipos |
| 34 | `GET` | `/api/notifications/me` | Autenticados | campana de notificaciones |
| 35 | `PATCH` | `/api/notifications/:id/read` | Autenticados | campana de notificaciones |
| 36 | `POST` | `/api/notifications/send` | — | **Declarada en el front, sin consumidor** (ver §4) |

> Las rutas 1, 2 y 3 comparten el recurso `/api/users` con propósitos distintos.

---

## 3. Detalle por ruta

Convenciones de esta sección:

- **Obligatorio** = si el campo falta o viene vacío, el front muestra un error de contrato.
- **Opcional** = puede faltar; el front muestra el dato vacío (“—”) sin inventarlo.
- Los nombres indicados son los **canónicos**; el front tolera alias habituales (`snake_case`, español),
  pero se recomienda emitir siempre el canónico.

### 3.1 Autenticación

#### `POST /api/auth/login` · público

```json
// Request
{ "email": "ana@club.com", "password": "secreto" }

// Response 200 (token puede venir como `token` o `accessToken`)
{
  "token": "eyJhbGciOi...",
  "user": { "id": "usr-9", "email": "ana@club.com", "role": "MIEMBRO", "nombre": "Ana", "apellido": "López" }
}
```

Reglas:

- El JWT **debe** incluir los claims `role`, `email`, `exp` y `sub` (o `id` / `userId`). Sin `role`
  el sidebar queda vacío y los guards de rol bloquean toda la aplicación.
- `401` / `403` → la UI muestra “Correo o contraseña incorrectos”.
- Respuesta sin token → error de contrato (“La respuesta de auth/login no incluye un token”).

#### `POST /api/users` · alta de miembro

```json
// Request (password mínimo 6 caracteres en la UI, name máx. 80)
{ "name": "Ana López", "email": "ana@club.com", "password": "secreto" }

// Response 201
{ "id": "usr-10", "email": "ana@club.com", "role": "MIEMBRO", "name": "Ana López", "cardNumber": "MEM-2026-0010" }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `id` | ✅ | Sin `id` el alta se considera fallida |
| `email` | — | Se usa como nombre visible si falta `name` |
| `role` | — | Debe ser `MIEMBRO` |
| `name` / `nombre` + `apellido` | — | Se concatenan si no llega `name` completo |
| `cardNumber` | — | Carné generado por el backend |

`409` si el correo ya existe. El backend asigna rol `MIEMBRO` y el carné.

#### `GET /api/users?role=MIEMBRO&search=<texto>` · búsqueda de miembros

```json
{ "data": [ { "id": "usr-9", "email": "ana@club.com", "role": "MIEMBRO", "name": "Ana López", "cardNumber": "MEM-2026-0009" } ] }
```

- `search` es opcional: ausente → padrón completo de miembros.
- Los elementos sin `id` se descartan silenciosamente.
- `403` para roles distintos de `RECEPCION_ADMIN` (ver §4.2).

### 3.2 Membresías

#### `GET /api/memberships/me` · `MIEMBRO`

```json
// Con membresía
{
  "id": "mem-1", "memberId": "usr-9", "planId": "plan-2", "planName": "Mensual Full",
  "status": "Vigente", "endDate": "2026-12-20", "remainingClasses": 8
}

// Sin membresía → 200 (no 404)
{
  "id": null, "memberId": "usr-9", "planId": null, "planName": null,
  "status": "Sin Membresía", "endDate": null, "remainingClasses": null
}
```

| Campo | Obligatorio |
| --- | --- |
| `id` + `status` | ✅ para considerar que hay membresía (si falta cualquiera → estado vacío) |
| `planId`, `planName`, `endDate` | ✅ cuando hay membresía |
| `remainingClasses` | ✅ **siempre presente**; `null` = plan ilimitado |

Estados observados: `Vigente`, `Vencida`, `Sin Membresía`.
Un `404` aquí se pinta como error de pantalla, no como “sin membresía”.

#### `POST /api/memberships/purchase` · `RECEPCION_ADMIN`

```json
// Request
{ "memberId": "usr-9", "planId": "plan-2" }

// Response 201 (el front no lee campos; solo importa el 2xx)
{ "membershipId": "mem-2", "chargeId": "chg-7", "newEndDate": "2026-12-20", "status": "Vigente" }
```

### 3.3 Planes

#### `GET /api/plans` · autenticados

```json
{ "data": [
  { "id": "plan-1", "name": "Mensual Básico", "type": "MENSUAL", "price": 150,
    "durationDays": 30, "classCount": 8, "benefits": "Acceso a sala", "active": true }
] }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `id`, `name`, `price`, `durationDays`, `active` | ✅ | |
| `classCount` | ✅ | **La clave debe existir**; `null` = clases ilimitadas |
| `type`, `benefits` | — | |

#### `POST /api/plans` · `PUT /api/plans/:id` · `RECEPCION_ADMIN`

```json
{ "name": "Mensual Básico", "price": 150, "durationDays": 30, "classesIncluded": 8 }
```

`classesIncluded: null` = ilimitadas. El `PUT` envía el objeto completo.

- Si la respuesta trae cuerpo, debe ser un **plan completo** (mismos obligatorios que el listado).
- `204` / cuerpo vacío también es válido (el front refresca la pantalla).

#### `PATCH /api/plans/:id/status` · `RECEPCION_ADMIN`

```json
{ "active": false }
```

Respuesta ignorada; basta `2xx`.

### 3.4 Clases y sesiones

#### `GET /api/class-sessions` · autenticados

```json
{ "data": [
  { "id": "class-yoga", "name": "Yoga Flow",
    "trainerId": "usr-trainer", "trainerName": "Carlos Mendoza",
    "date": "2026-11-25", "startTime": "18:00", "durationMinutes": 60,
    "maxCapacity": 20, "reservedCount": 14, "availableSpots": 6, "status": "Programada" }
] }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `id`, `name`, `date`, `startTime`, `durationMinutes`, `maxCapacity`, `status` | ✅ | |
| `availableSpots` **o** `reservedCount` | ✅ uno de los dos | Si falta `availableSpots` se deriva de `maxCapacity - reservedCount` |
| Entrenador | ✅ | `trainer: { id, name }` anidado **o** `trainerId` + `trainerName` planos |

Estados observados: `Programada`, `Cancelada`, `Finalizada`.

#### `POST /api/classes` · `PUT /api/classes/:id` · `RECEPCION_ADMIN`

```json
{ "name": "Yoga Flow", "trainerId": "usr-trainer", "date": "2026-11-25",
  "startTime": "18:00", "durationMinutes": 60, "maxCapacity": 20 }
```

El `PUT` envía la clase completa. Si hay cuerpo en la respuesta debe ser una sesión completa
(mismos obligatorios que `GET /api/class-sessions`); `204` también es válido.

#### `PATCH /api/classes/:id/cancel` · `RECEPCION_ADMIN`

```json
{ "reason": "Falta de entrenador" }
```

Respuesta ignorada; basta `2xx`. El motivo es obligatorio en la UI (no vacío).

#### `POST /api/class-sessions/:id/reserve` · `MIEMBRO`

```json
// Response 201 (cuerpo opcional en el contrato actual)
{ "reservationId": "res-1", "status": "Activa", "message": "Reserva confirmada" }
```

- Si hay cuerpo, `reservationId` (o `id`) es obligatorio.
- `status` se interpreta por texto: contiene `cancel` → `Cancelada`; en cualquier otro caso → `Activa`.
- `403` membresía vencida · `409` cupo agotado o reserva duplicada · `404` sesión inexistente.

### 3.5 Reservas

#### `GET /api/reservations/me` · `MIEMBRO`

```json
{ "data": [
  { "id": "res-1", "classId": "class-yoga", "name": "Yoga Flow",
    "date": "2026-11-25", "startTime": "18:00", "status": "Activa", "cancelledAt": null }
] }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `id`, `classId`, `name`, `date`, `startTime`, `status` | ✅ | |
| `status` | ✅ | **Debe contener** `activ` o `cancel`; cualquier otro valor rompe la pantalla |
| `cancelledAt` | — | Solo cuando la reserva está cancelada |

#### `DELETE /api/reservations/:id` · `MIEMBRO`

- `204` (ideal) o `200` con/sin cuerpo. Cuerpo ignorado.
- `404` reserva inexistente o de otro miembro · `409` reserva ya cancelada.

### 3.6 Entrenadores y disponibilidad

#### `GET /api/trainers` · autenticados

```json
{ "data": [ { "id": "usr-trainer", "name": "Carlos Mendoza" } ] }
```

`id` y `name` obligatorios. Se acepta `trainer: { id, name }` anidado.

#### `GET /api/trainers/:id/availability` · autenticados

```json
{ "data": [
  { "slotId": "slot-1", "date": "2026-11-26", "startTime": "10:00",
    "endTime": "11:00", "isBooked": false }
] }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `slotId`, `date`, `startTime` | ✅ | |
| `endTime` | — | Si se envía debe ser real: **hoy el backend de pruebas devuelve siempre `11:00`**, así que la UI lo ignora y calcula `startTime + 60 min` |
| `isBooked` | — | Ausente = “no informado”; nunca se asume libre |

#### `POST /api/trainer-availability` · `ENTRENADOR`

```json
// Request; el entrenador se identifica por el JWT
{ "date": "2026-11-26", "startTime": "10:00" }
```

El backend calcula el fin del bloque (+60 min). Hora válida en la UI: `06:00`–`20:00`, fecha no pasada.
Respuesta ignorada; `409` si el bloque se solapa con otro.

#### `DELETE /api/trainer-availability/:id` · `ENTRENADOR`

`204`. `403` si el bloque no es del entrenador autenticado · `409` si ya está reservado.

#### `POST /api/personal-sessions` · `MIEMBRO`

```json
// Request
{ "trainerId": "usr-trainer", "slotId": "slot-1" }

// Response (no se leen campos)
{ "sessionId": "ps-1", "status": "Agendada" }
```

`403` bloque ajeno/ocupado por rol · `409` bloque ya reservado (se muestra el mensaje tal cual).

### 3.7 Control de acceso

#### `POST /api/access/check-in` · `RECEPCION_ADMIN`

```json
// Request: carné exacto o nombre completo
{ "cardNumber": "MEM-2026-0009", "allowException": false }

// Response 201
{ "accessId": "acc-1", "memberName": "Ana López", "result": "Permitido",
  "timestamp": "2026-11-20T07:00:00.000Z" }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `accessId` (o `id`), `memberName` | ✅ | |
| `result` | ✅ | **Exactamente** `Permitido` o `Excepcion` (sin acentos ni minúsculas) |
| `timestamp` | — | |

- `404` carné no encontrado.
- `403` membresía vencida **y** `allowException: false` → la UI activa el switch de excepción y reintenta
  con `allowException: true`, que debe responder `201` con `result: "Excepcion"`.
- `409` ingreso duplicado.

### 3.8 Cobros y pagos

#### `GET /api/charges/pending` · `RECEPCION_ADMIN`

Query: `page`, `limit` (siempre enviados, `limit=10`), y opcionales `startDate`, `endDate`, `memberId`
(fechas `YYYY-MM-DD`).

```json
{
  "data": [
    { "id": "chg-1", "memberId": "usr-9", "memberName": "Ana López", "cardNumber": "MEM-2026-0009",
      "concept": "Renovación mensual", "amount": 150, "dueDate": "2026-11-01", "status": "PENDIENTE" }
  ],
  "total": 23, "page": 1, "limit": 10, "totalPages": 3
}
```

| Campo | Obligatorio |
| --- | --- |
| `id`, `amount` (por cobro) | ✅ |
| `memberId`, `memberName`, `cardNumber`, `concept`, `dueDate`, `status` | — (se acepta `member: { name }` anidado) |
| `total`, `page`, `limit`, `totalPages` | — (si faltan se calculan sobre lo recibido) |

`dueDate` es la fecha de vencimiento; el front hace fallback a `date` y `createdAt`.

#### `POST /api/payments/process` · `MIEMBRO`

```json
// Request
{ "chargeId": "chg-1", "cardNumber": "4111111111111111", "expMonth": 12, "expYear": 2027, "cvv": "123" }

// Response 201
{ "receiptNumber": "REC-00042", "amount": 150, "paidAt": "2026-11-20T15:30:00.000Z",
  "concept": "Renovación mensual", "last4": "1111", "status": "PAGADO" }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `receiptNumber` | ✅ | También se acepta dentro de `{ "receipt": {...} }` o `{ "data": {...} }` |
| `amount`, `paidAt`, `concept`, `last4`, `status` | — | Si falta `last4` se usan los 4 dígitos enviados |

- `cardNumber` llega solo con dígitos y **exactamente 16**; `expMonth` 1–12; `expYear` de 4 dígitos
  (`MM/YY` se convierte a `20YY`); `cvv` de 3 a 4 dígitos.
- `402`/`409` cobro ya pagado o rechazado · `404` cobro inexistente.
- El CVV se envía en el cuerpo: **no debe persistirse ni registrarse en logs**.

### 3.9 Entrenamiento

#### `POST /api/routines` · `ENTRENADOR`

```json
// Request (1 a 30 ejercicios; name 2–100, series 1–20, reps 1–100)
{ "memberId": "usr-9",
  "exercises": [ { "name": "Press banca", "series": 4, "reps": 10 } ] }

// Response 201
{ "routineId": "routine-1", "memberId": "usr-9", "updatedAt": "2026-11-20T17:09:34.346Z" }
```

`routineId` y `memberId` obligatorios en la respuesta.

#### `POST /api/progress` · `MIEMBRO`

```json
// Request (rangos: weight 20–500, waist 30–300, chest 30–300; fecha no futura)
{ "date": "2026-11-20", "weight": 78.5, "waist": 84, "chest": 102,
  "strengthMarks": ["Press banca 80 kg"] }

// Response 201
{ "progressId": "progress-1", "memberId": "usr-9", "date": "2026-11-20" }
```

`progressId` obligatorio. Las métricas se completan con lo enviado; `date` se toma de la respuesta si viene.

#### `GET /api/progress` · `MIEMBRO` — **NO PUBLICADO (hoy responde `404`)**

Contrato esperado (la pantalla ya está preparada para consumirlo):

```json
{ "data": [
  { "progressId": "progress-1", "memberId": "usr-9", "date": "2026-11-20",
    "weight": 78.5, "waist": 84, "chest": 102, "strengthMarks": ["Press banca 80 kg"] }
] }
```

- Por registro son obligatorios `progressId` (o `id`), `date`, `weight`, `waist`, `chest`.
- `strengthMarks` debe ser un array de strings (los valores no textuales se descartan).
- Debe devolver **solo el historial del miembro autenticado**, ordenado por fecha descendente.
- Mientras responda `404`, la UI muestra “sin historial disponible” (no es un error).

### 3.10 Reseñas

#### `POST /api/reviews` · `MIEMBRO`

```json
// Request (rating 1–5, comment máx. 300)
{ "sessionId": "class-yoga", "rating": 5, "comment": "Excelente clase" }

// Response 201
{ "reviewId": "review-1", "sessionId": "class-yoga", "rating": 5, "createdAt": "2026-11-20T17:43:15.049Z" }
```

`reviewId` obligatorio. `sessionId` y `rating` se completan con lo enviado si no vuelven.
`403` membresía no vigente · `409` clase no finalizada, fuera de los 7 días o reseña duplicada.

#### `GET /api/reviews/analytics` · `RECEPCION_ADMIN`

Query obligatoria: `startDate`, `endDate` (`YYYY-MM-DD`). Opcionales: `trainerId`, `classId`.

Se acepta **cualquiera** de estas dos formas (se recomienda la primera, ya documentada por BE-17.1):

```json
{
  "byTrainer": [ { "trainerId": "usr-trainer", "trainerName": "Carlos Mendoza", "average": 4.25, "totalReviews": 8 } ],
  "byClass":   [ { "classId": "class-yoga", "className": "Yoga Flow", "average": 5, "totalReviews": 2 } ]
}
```

```json
{ "data": [
  { "targetType": "TRAINER", "targetId": "usr-trainer", "targetName": "Carlos Mendoza",
    "average": null, "totalReviews": 0 }
] }
```

Por fila son obligatorios el identificador (`targetId` / `trainerId` / `classId`) y el nombre
(`targetName` / `trainerName` / `className`). `average: null` = objetivo sin reseñas.

### 3.11 Reportes

#### `GET /api/reports/occupancy` · `RECEPCION_ADMIN`

Query obligatoria: `startDate`, `endDate`. Opcional: `classId`.

```json
{ "data": [
  { "id": "class-yoga", "className": "Yoga Flow", "date": "2026-11-25", "startTime": "18:00",
    "maxCapacity": 20, "reservedCount": 14, "availableSpots": 6,
    "occupancyRate": 70, "occupancyPercentage": 70 }
] }
```

Todos los campos son opcionales en el adaptador, pero **hoy la API solo devuelve
`className` y `occupancyPercentage`**, por lo que la tabla muestra fecha, cupos y tasa vacíos.

#### `GET /api/reports/financial` · `RECEPCION_ADMIN`

Query obligatoria: `startDate`, `endDate`.

```json
{ "period": "2026-11", "totalRevenue": 2450, "paymentCount": 18,
  "renewals": 8, "renewalRate": 44.4 }
```

Todos los campos son opcionales, pero **hoy la API solo devuelve `totalRevenue` y `renovationRate`**
(grafía distinta), así que período, cantidad de pagos y renovaciones aparecen vacíos.

### 3.12 Equipos

#### `GET /api/equipment?status=<estado>` · autenticados

```json
{ "data": [
  { "id": "eq-002", "name": "Prensa de Pecho", "category": "Fuerza",
    "status": "En Mantenimiento", "reason": "Calibración preventiva",
    "updatedAt": "2026-11-19T09:00:00.000Z" }
] }
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `id`, `name`, `status` | ✅ | |
| `status` | ✅ | Catálogo **exacto**: `Operativa` · `En Mantenimiento` · `Fuera de Servicio` (otro valor rompe la pantalla) |
| `category`, `reason`, `updatedAt` | — | `reason` debe ser `null` cuando el estado es `Operativa` |

- El filtro por `status` debe aplicarse **en el backend**; el listado debe venir ordenado por `name`.

#### `PATCH /api/equipment/:id/status` · `RECEPCION_ADMIN`

```json
{ "status": "En Mantenimiento", "reason": "Calibración preventiva" }
```

`reason` es `null` cuando el estado es `Operativa`; en otro caso el front exige entre 5 y 200 caracteres.
Respuesta ignorada; basta `2xx`.

### 3.13 Notificaciones

#### `GET /api/notifications/me?page=<n>` · autenticados

```json
{
  "data": [
    { "id": "ntf-1", "title": "Membresía por vencer",
      "message": "Tu membresía vence en 3 días.", "createdAt": "2026-11-20T12:00:00.000Z", "isRead": false }
  ],
  "unreadCount": 3
}
```

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `unreadCount` | ✅ | **Debe estar siempre**, incluso con valor `0`; si falta, la campana falla |
| `id`, `title`, `message`, `createdAt`, `isRead` (por notificación) | ✅ | `isRead` admite `true`/`false` o `"true"`/`"false"`/`"si"`/`"no"` |

`page` se envía siempre (`page=1` por defecto). La respuesta **debe ser un objeto** (un array plano no es
válido aquí, porque `unreadCount` viaja en el mismo nivel que la lista).

#### `PATCH /api/notifications/:id/read` · autenticados

Debe devolver la **notificación completa actualizada** (mismos obligatorios que el listado).
`404` si no existe o no pertenece al usuario autenticado.

---

## 4. Huecos y problemas de integración detectados

Todo lo siguiente provoca pantallas vacías, mensajes genéricos o funcionalidad degradada.

### 4.1 `GET /api/progress` no existe

`404` en cada visita a `/progress`. La UI lo tolera (muestra “sin historial”), pero la historia
de consulta de progreso no es funcional. **Acción:** publicar el endpoint de §3.9.

### 4.2 `GET /api/users` bloquea al rol `ENTRENADOR`

`GET /api/users` exige `RECEPCION_ADMIN`, pero la pantalla `/trainer/routines` necesita buscar
miembros. El entrenador recibe `403` y la UI cae al modo “escribe el identificador a mano”.

**Opciones:** permitir `ENTRENADOR` con `role=MIEMBRO` (solo campos `id`/`name`/`cardNumber`), o exponer
un endpoint acotado (`GET /api/trainers/:id/members`).

### 4.3 `endTime` fijo en la disponibilidad

`GET /api/trainers/:id/availability` devuelve siempre `endTime: "11:00"` sin importar `startTime`.
La UI lo ignora y calcula `startTime + 60 min`, pero cualquier otro consumidor recibirá datos falsos.

### 4.4 Reportes incompletos

- `GET /api/reports/financial`: solo `{ totalRevenue, renovationRate }` → faltan `period`,
  `paymentCount`, `renewals` y la grafía correcta `renewalRate`.
- `GET /api/reports/occupancy`: solo `{ className, occupancyPercentage }` → faltan `id`, `date`,
  `startTime`, `maxCapacity`, `reservedCount`, `availableSpots`, `occupancyRate`.

### 4.5 Envoltorios inconsistentes

Unas rutas responden `{ "data": [...] }`, otras un array plano y otras un objeto con listas dentro.
El front tolera las tres, pero conviene fijar **una sola convención** (se sugiere `{ "data": ... }`).

### 4.6 Respuestas de error sin cuerpo

Cuando un `4xx` no trae JSON con `error`/`message`/`detail`, la UI pierde el motivo original y muestra
una copy genérica por código (`403`, `404`, `409`, `400`). Enviar siempre el cuerpo de error.

### 4.7 Respuestas parciales en altas y ediciones

`POST /api/users`, `POST`/`PUT /api/plans`, `POST`/`PUT /api/classes` y `POST /api/routines`:
si devuelven cuerpo, debe ser el **DTO completo**; un cuerpo parcial (`{ "id": "..." }`) provoca error
de contrato. Alternativa válida: `204` sin cuerpo.

### 4.8 Campos obligatorios que hoy faltan

- `GET /api/memberships/me`: `remainingClasses` debe venir siempre (`null` = ilimitado).
- `GET /api/notifications/me`: `unreadCount` debe venir siempre (`0` incluido).
- `GET /api/class-sessions`: `trainerName` (o `trainer.name`) y los cupos (`availableSpots` o `reservedCount`).
- `GET /api/charges/pending`: `amount` en cada cobro.

### 4.9 Grafías sensibles a mayúsculas

Estos valores se comparan por texto y **no** se normalizan:

| Contexto | Valores aceptados |
| --- | --- |
| `access.checkIn.result` | `Permitido` · `Excepcion` |
| `equipment.status` | `Operativa` · `En Mantenimiento` · `Fuera de Servicio` |
| `reservations.status` | debe contener `activ` o `cancel` |
| `login.user.role` | `MIEMBRO` · `ENTRENADOR` · `RECEPCION_ADMIN` |

### 4.10 `POST /api/notifications/send` sin consumidor

La ruta está declarada en [`lib/api-routes.ts`](../lib/api-routes.ts) pero el frontend no la invoca.
No es necesaria para la integración actual; si el backend la expone, ningún flujo la usa todavía.

---

## 5. Verificación rápida (curl)

```bash
# Login y captura del token
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@club.com","password":"secreto"}'

# Listados base
curl -s http://localhost:8000/api/class-sessions      -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/plans               -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/trainers            -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/equipment           -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:8000/api/reports/financial?startDate=2026-11-01&endDate=2026-11-30" \
  -H "Authorization: Bearer $TOKEN"
```

Checklist mínimo antes de dar una integración por cerrada:

1. `POST /api/auth/login` devuelve token con claims `role`, `email`, `exp`, `sub`.
2. `GET /api/memberships/me` responde `200` (con `id: null`) cuando el miembro no tiene membresía.
3. `GET /api/class-sessions` incluye `trainerName` y cupos por sesión.
4. `POST /api/access/check-in` devuelve `result` en el catálogo exacto y `403` cuando aplica excepción.
5. `GET /api/progress` está publicado y filtrado por el miembro autenticado.
6. `GET /api/reports/*` devuelve el contrato completo de §3.11.
7. Todos los `4xx` incluyen `{ "error": "..." }`.
