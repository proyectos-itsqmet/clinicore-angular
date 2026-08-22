# Panel administrativo — análisis de brecha

> **31 destinos, 7 tablas.**
> El panel ya tiene su navegación completa y sus 31 rutas generadas, pero las 31 resuelven al mismo
> componente placeholder. Esto es qué datos existen, qué falta, y en qué orden conviene atacarlo para
> tocar el backend lo menos posible.

Versión navegable: <https://claude.ai/code/artifact/9773026a-e12c-4f7c-9bc4-514942739ab7>

---

## Resumen

| Estado | Destinos | Qué significa |
| :--- | ---: | :--- |
| ✅ Listos hoy | **3** | Tabla y endpoints existen. Solo falta construir la pantalla. |
| ⚠️ Falta endpoint | **9** | Los datos ya están en la base. Falta cómo leerlos o agregarlos. |
| ⛔ Falta tabla | **19** | Dominio nuevo. Requiere modelar y migrar esquema. |
| — | **12** | **39% del panel se puede completar sin una sola tabla nueva.** |

---

## La oferta — lo que el backend ya tiene

Siete entidades JPA más dos tablas puente. La columna que importa es la última: tener la tabla no
sirve si el panel no tiene por dónde leerla.

| Tabla | Columnas de negocio | Endpoints |
| :--- | :--- | :--- |
| `patients` | email, password, firstName, lastName, ci, birthday, gender, address, phone, emergencyContactName, emergencyContactPhone, role, createdAt | ⛔ **Sin controller** |
| `doctors` | email, password, firstName, lastName, **speciality (texto libre)**, gender, ci, role, createdAt | ✅ CRUD completo |
| `operators` | email, password, firstName, lastName, role, createdAt, stablishment_id | ✅ CRUD completo |
| `stablishments` | name, address | ✅ CRUD completo |
| `services` | name, price, discount, createdAt | ✅ CRUD completo |
| `schedules` | date, hour, status, doctor_id, service_id, stablishment_id, createdAt | ✅ CRUD completo |
| `turns` | turn_order, status, createdAt, finishedAt, cancelledAt, operator_id, patient_id, schedule_id | ⚠️ Sin update ni delete |
| `stablishment_has_doctors`<br>`stablishment_has_services` | Tablas puente | ✅ Asignación vía `POST /api/doctors/{id}/stablishments/{sid}` y `POST /api/stablishments/{id}/services/{sid}` |

### El hueco más barato de tapar

No existe `PatientController`, pero `PatientService` **ya tiene** `getPatientById`, `updatePatient` y
`deletePatient` escritos. Hoy son código muerto: nadie los puede llamar. Un controller delgado sobre
métodos que ya existen desbloquea cinco destinos del panel sin tocar el esquema.

---

## La demanda — los 31 destinos, uno por uno

Las etiquetas son literales de `admin-nav.data.ts`, para que coincidan con el menú que vas a mirar
mientras trabajás.

### Dashboard — 2 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Resumen general | ⚠️ Endpoint | Agregados sobre `turns`, `schedules`, `patients`. Los datos están; falta un endpoint que los sume. |
| Analytics | ⚠️ Endpoint | Series de tiempo sobre `turns.createdAt` / `finishedAt`. Sin tabla nueva. |

### Métricas — 3 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Establecimientos | ⚠️ Endpoint | Agrupar turnos y agenda por `stablishment_id`. |
| Empleados | ⚠️ Endpoint | Agrupar por `doctor_id` y `operator_id`. Ojo: agrupar por especialidad hoy da basura (ver Mina 2). |
| Pacientes | ⚠️ Endpoint | Agregados sobre `patients` + `turns`. Depende de que exista `PatientController`. |

### Módulos — 1 destino

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Gestionar módulos | ⛔ Tabla | `modules` (key, label, enabled). Es configuración del panel, no dominio clínico: tabla chica. |

### Personalización — 1 destino

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Estilo | ⛔ Tabla | `branding` (logo, colores, nombre comercial). Alternativa sin tabla: dejarlo en los tokens y no hacerlo editable. |

### Admin — 5 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Gestor de establecimientos | ✅ Listo | `/api/stablishments` tiene CRUD y asignación de servicios. Solo falta la pantalla. |
| Usuarios | ⚠️ Endpoint | Doctores y operadores listan bien. Pacientes no: falta `PatientController`. |
| Especialidades | ⛔ Tabla | `specialities` + FK en `doctors`. Hoy `speciality` es un `String` libre. |
| Planes de cobertura | ⛔ Tabla | `insurers`, `coverage_plans`, `patient_coverage`. Hoy vive solo como JSON estático de la landing. |
| Horarios de atención | ⛔ Tabla | `schedule_templates` (día de semana, rango, duración de slot). `schedules` es un cupo concreto, no una plantilla recurrente. |

### Precios — 5 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Citas | ✅ Listo | `services.price` con CRUD en `/api/services`. |
| Paquetes | ⛔ Tabla | `packages` + `package_items`. |
| Sesiones | ⛔ Tabla | `session_plans` (cantidad de sesiones, vigencia, consumo). |
| Descuentos | ⛔ Tabla | `services.discount` es un solo `Float` sin código, sin vigencia y sin regla. Para administrarlos hace falta `discounts`. |
| Promociones | ⛔ Tabla | `promotions` (vigencia, pieza gráfica, descuento asociado). |

### Bloqueo de citas — 4 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Días feriados | ⛔ Tabla | `holidays` (fecha, nombre, sede opcional). Tabla mínima. |
| Vacaciones | ⛔ Tabla | `time_off` — la misma tabla cubre este destino y el siguiente con una columna `kind`. |
| Permisos | ⛔ Tabla | Comparte `time_off` con Vacaciones. Dos pantallas, una tabla. |
| Motivos | ⛔ Tabla | `block_reasons`. Catálogo puro: id, nombre, tipo. |

### Turnos — 1 destino

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Gestión de turnos | ✅ Listo | `/api/turns` lista paginado, crea, marca atendido y cancela. Es el destino más avanzado del panel. |

### Calendario — 1 destino

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Calendario | ⚠️ Endpoint | `schedules` y `turns` alcanzan, pero `getAll` es paginado sin filtro por rango de fechas. Un calendario pide un rango, no una página. |

### Pacientes — 3 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Información | ⚠️ Endpoint | La tabla y los métodos de servicio ya existen. Falta solo el controller. |
| Historial clínico | ⛔ Tabla | `encounters` (paciente, doctor, turno, diagnóstico, plan). Dominio nuevo y el más delicado: es dato de salud. |
| Recetas | ⛔ Tabla | `prescriptions` + `prescription_items` (medicamento, dosis, frecuencia, duración). |

### Finanzas — 3 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Facturación | ⛔ Tabla | `invoices` + `invoice_items` + `payments`. Si alguna vez factura de verdad en Ecuador, necesita RUC, secuencial por establecimiento y punto de emisión, IVA y clave de acceso del SRI. |
| Contabilidad | ⛔ Tabla | Se deriva de facturación. Sin `invoices` no hay nada que contabilizar. |
| Reclamos | ⛔ Tabla | `claims`. Depende de que existan planes de cobertura y facturas. |

### Reportes — 2 destinos

| Destino | Estado | Qué necesita |
| :--- | :--- | :--- |
| Auditoría HC | ⛔ Tabla | `audit_log` inmutable (actor, acción, entidad, antes, después, cuándo). No se puede auditar un historial clínico que todavía no existe. |
| General | ⚠️ Endpoint | Agregados sobre lo que ya hay. Es el mismo motor que Dashboard. |

---

## El plan — en qué orden conviene atacarlo

Ordenado por destinos desbloqueados sobre esfuerzo, no por el orden del menú. Si el objetivo es
tocar poco el backend, las dos primeras etapas son casi todo el retorno.

### 1. El controller que falta

Crear `PatientController` sobre los métodos que `PatientService` ya tiene, más un `findAll` paginado
en el repositorio. Un archivo nuevo, cero migraciones.

- Desbloquea **Usuarios**, **Pacientes → Información** y habilita **Métricas → Pacientes**.
- Deja de tener `updatePatient` y `deletePatient` como código inalcanzable.

`3 destinos` · `0 tablas nuevas` · `1 archivo`

### 2. Un endpoint de agregados

Un `MetricsController` con consultas de conteo y agrupación sobre las tablas que ya existen. No
guarda nada: solo lee y suma.

- Desbloquea **Dashboard** (2), **Métricas** (3) y **Reportes → General**.
- Sumar un filtro por rango de fechas en `/api/schedules` desbloquea también **Calendario**.

`7 destinos` · `0 tablas nuevas`

### 3. Cuatro catálogos chicos

Tablas de tres o cuatro columnas, con el CRUD genérico que ya sabés escribir porque
`ServicioController` es exactamente esa forma.

- `specialities` — y de paso arregla la Mina 2.
- `holidays` — fecha, nombre, sede opcional.
- `block_reasons` — catálogo puro.
- `time_off` — cubre **Vacaciones** y **Permisos** con una columna `kind`.

`5 destinos` · `4 tablas chicas`

### 4. Lo que es proyecto aparte

Historial clínico, recetas, facturación, cobertura, reclamos y auditoría. Son cuatro dominios
nuevos, no cuatro pantallas: dato de salud, dato tributario, y un log inmutable que existe
justamente para que nadie lo edite.

- **11 destinos** dependen de este bloque — el 35% del panel.
- Recomendación: dejarlos en placeholder marcado. El placeholder actual ya dice honestamente que no
  está construido, y eso vale más que una tabla con datos inventados.

`11 destinos` · `~12 tablas`

---

## Antes de construir — tres minas en el esquema actual

Un panel administrativo es una interfaz llena de botones de borrar y de menús desplegables. Estas
tres cosas hoy no molestan porque nadie las usa todavía.

### Mina 1 — borrar un doctor borra historia de citas

`Doctor.schedules`, `Servicio.schedules` y `Stablishment.schedules` están declarados con
`cascade = ALL, orphanRemoval = true`, y `Schedule.turns` con `cascade = ALL`. La cadena se propaga
sola:

```
DELETE /api/doctors/{id}
  → borra sus schedules
  → borra los turns de esos schedules
  → la historia de citas del paciente desaparece
```

Lo mismo si borrás un servicio o un establecimiento. Y no hay borrado lógico en ninguna entidad: los
`DeleteMapping` de doctores, servicios y establecimientos son borrado físico.

> **Arreglo:** borrado lógico (`active` o `deletedAt`) y sacar el cascade de `schedules`. Conviene
> hacerlo *antes* de que el panel tenga botones de borrar, no después.

### Mina 2 — la especialidad es texto libre

`Doctor.speciality` es un `String` sin FK y sin enum. Para la base de datos, «Cardiología»,
«cardiologia» y «Cardiologia» son tres especialidades distintas. Eso rompe dos destinos a la vez:
**Métricas → Empleados** agrupa mal, y **Admin → Especialidades** no tiene nada que administrar.

> **Arreglo:** tabla `specialities` y FK en `doctors`. Es la etapa 3 del plan, y es la única de esas
> cuatro tablas que además repara datos.

### Mina 3 — todos los operadores son admin

`Role` declara `ROLE_EMPLOYEE`, pero ninguna entidad lo usa: `Operator.role` tiene
`@Builder.Default` en `ROLE_ADMIN`. Con eso, **Admin → Usuarios** no puede ofrecer gestión de
permisos real, y no hay mínimo privilegio en un sistema que va a manejar datos de salud.

De paso, en el mismo paquete: `TurnStatus.TURN_WAITNG` tiene el nombre mal escrito. Hoy no duele;
cuando sea el valor de un desplegable y esté guardado en filas reales, renombrarlo pide migración.

> **Arreglo:** ambos son cambios de una línea *ahora* y migraciones *después*. Este es el momento
> barato.

---

## Trazabilidad

Fuentes leídas para este informe:

**clinicore-angular**
- `src/app/features/admin/admin-nav.data.ts` — los 31 destinos, fuente única de verdad
- `src/app/features/admin/admin.routes.ts` — la tabla de rutas, generada desde el nav
- `src/app/features/admin/admin-placeholder-page.ts` — confirma que los 31 son placeholder
- `src/app/core/api/index.ts` — solo `landing-api` y `sala-api`; no hay capa de API del panel
- `src/app/shared/tokens/theme.css` — paleta y tipografías

**Backend_QMS**
- Las 7 entidades de `com.devluis.entity`
- Los 8 controllers de `com.devluis.controller`
- `com.devluis.services.PatientService`
- Los enums de `com.devluis.types` (`Role`, `TurnStatus`, `ScheduleStatus`, `Gender`)
