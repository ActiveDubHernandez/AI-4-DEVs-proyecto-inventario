# Sistema de Gestión de Inventario

Monorepo full-stack para registrar productos, documentar entradas y salidas de stock, consultar inventario en tiempo real y detectar productos bajo el umbral mínimo. Proyecto formativo del curso *AI for Devs*, orientado a buenas prácticas de arquitectura, pruebas automatizadas y despliegue en la nube.

---

## Descripción ejecutiva

La solución separa responsabilidades en un **API REST** (NestJS + TypeORM + PostgreSQL) y una **SPA** (React + Vite) que consume el backend vía Axios.

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| **Backend** | NestJS 11, TypeScript, TypeORM | CRUD de productos, registro de movimientos (`entrada` / `salida`), cálculo de stock por agregación SQL, alertas de bajo stock, validación con DTOs (`class-validator`). |
| **Base de datos** | PostgreSQL 16+ | Fuente de verdad; conexión local por variables `DB_*` o producción vía `DATABASE_URL` (Render) con SSL. |
| **Frontend** | React 19, Vite, React Router | Lista de productos con indicador de stock, formulario de movimientos con validación en tiempo real y navegación global. |
| **Calidad** | Jest, fast-check (PBT), Stryker, Playwright, GitHub Actions | Unitarias, property-based, mutación, E2E de UI y pipeline CI en cada push/PR. |

**Decisiones técnicas destacadas:**

- Las operaciones que modifican inventario (salidas) se ejecutan dentro de **transacciones TypeORM** (`DataSource.transaction`) para evitar condiciones de carrera.
- El stock actual se deriva del historial de movimientos, no de un contador mutable suelto.
- Los productos eliminados usan **baja lógica** (soft delete); no aparecen en listados activos ni en nuevos movimientos.
- CORS configurable para desarrollo local y despliegues (Vercel + Render).

### API principal

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` / `POST` / `PATCH` / `DELETE` | `/products` | CRUD de productos |
| `POST` / `GET` | `/movements` | Crear y listar movimientos |
| `GET` | `/inventory/products/:productId/stock` | Stock actual de un producto |
| `GET` | `/inventory/alerts/low-stock` | Productos en o bajo stock mínimo |

Documentación extendida: [`docs/PRD.md`](docs/PRD.md), [`docs/user-stories.md`](docs/user-stories.md), [`docs/tickets.md`](docs/tickets.md).

---

## Estructura del repositorio

```text
proyecto-inventario/
├── backend/          # API NestJS
├── frontend/         # SPA React + Vite
├── docs/             # PRD, historias de usuario, tickets
├── .github/workflows/ci.yml
└── README.md
```

---

## Requisitos previos

| Herramienta | Versión recomendada |
| --- | --- |
| [Node.js](https://nodejs.org/) | 22.x (alineado con CI) |
| [npm](https://www.npmjs.com/) | 10+ (incluido con Node) |
| [PostgreSQL](https://www.postgresql.org/) | 16+ (local o Docker) |
| [Git](https://git-scm.com/) | Cualquier versión reciente |

Para pruebas E2E con Playwright, el navegador Chromium se instala con `npx playwright install` (ver sección de pruebas).

---

## Instalación local (paso a paso)

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd proyecto-inventario
```

### 2. Base de datos PostgreSQL

Crea una base de datos local (ejemplo):

```sql
CREATE DATABASE inventario;
```

En Windows/macOS/Linux puedes usar también Docker:

```bash
docker run --name inventario-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventario -p 5432:5432 -d postgres:16-alpine
```

### 3. Backend — dependencias y entorno

```bash
cd backend
npm install
```

Copia el archivo de ejemplo y ajusta credenciales:

```bash
cp .env.example .env
```

Variables relevantes en `backend/.env`:

| Variable | Uso |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Conexión local a PostgreSQL |
| `DATABASE_URL` | Producción (Render); tiene prioridad sobre `DB_*` |
| `DB_SYNCHRONIZE` | `true` solo en desarrollo (sincroniza esquema TypeORM) |
| `PORT` | Puerto del API (por defecto `3000`) |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma (ej. `http://localhost:5173`) |

### 4. Frontend — dependencias y entorno

Desde la raíz del monorepo:

```bash
cd ../frontend
npm install
cp .env.example .env
```

En `frontend/.env`:

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL del backend (local: `http://localhost:3000`) |

### 5. Verificar instalación (lint y build)

```bash
# Backend
cd backend
npm run lint:check
npm run build

# Frontend
cd ../frontend
npm run lint
npm run build
```

---

## Ejecución en desarrollo

Abre **dos terminales** (backend y frontend).

**Terminal 1 — API:**

```bash
cd backend
npm run start:dev
```

El servidor queda en `http://localhost:3000`.

**Terminal 2 — UI:**

```bash
cd frontend
npm run dev
```

La aplicación queda en `http://localhost:5173` (puerto por defecto de Vite).

---

## Pruebas

### Resumen de suites

| Suite | Ubicación | Herramienta | Qué valida |
| --- | --- | --- | --- |
| Unitarias + integración ligera | `backend/src/**/*.spec.ts` | Jest | Servicios, controladores, utilidades |
| Property-Based Testing (PBT) | `backend/src/**/*.pbt.spec.ts` | Jest + fast-check | Propiedades de stock, DTOs y movimientos |
| Mutantes críticos | `backend/src/critical-mutants.spec.ts` | Jest | Regresiones en mutantes M3, M4, M8 |
| E2E API | `backend/test` | Jest + Supertest | Flujos HTTP contra PostgreSQL |
| Mutation testing | `backend/src` (servicios seleccionados) | Stryker | Calidad de tests en lógica de inventario |
| E2E UI | `frontend/e2e` | Playwright | Lista de productos y formulario de movimientos |

Los archivos `*.pbt.spec.ts` se ejecutan con `npm test` porque comparten el patrón `*.spec.ts` de Jest.

### Backend

**Requisito:** PostgreSQL accesible con las mismas variables que en `.env` (o las de CI: base `inventario_test` para e2e).

```bash
cd backend

# Lint (sin auto-fix; igual que CI)
npm run lint:check

# Unitarias + PBT + critical-mutants (un solo comando)
npm test

# Cobertura opcional
npm run test:cov

# E2E API (necesita PostgreSQL; usa DB_* del entorno)
npm run test:e2e

# Mutation testing (puede tardar varios minutos)
npm run test:mutation

# Mutation en modo CI (concurrency 1, como GitHub Actions)
npm run test:mutation:ci
```

Reporte HTML de Stryker (tras mutación):

`backend/reports/mutation/mutation-report.html`

### Frontend — Playwright

Playwright levanta automáticamente backend (`start:dev`) y frontend (`dev`) según `frontend/playwright.config.ts`, salvo que ya tengas servidores en esos puertos (`reuseExistingServer`).

**Primera vez — instalar navegador:**

```bash
cd frontend
npx playwright install chromium
```

**Ejecutar E2E:**

```bash
cd frontend
npm run test:e2e
```

Comandos adicionales:

```bash
npm run test:e2e:ui      # Modo UI interactivo
npm run test:e2e:report  # Abrir reporte HTML tras una corrida
```

Variables opcionales:

| Variable | Valor por defecto |
| --- | --- |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` |
| `VITE_API_URL` | Debe apuntar al backend en ejecución |

### Suite completa recomendada (local)

Con PostgreSQL en marcha y dependencias instaladas:

```bash
# 1. Backend
cd backend
npm run lint:check
npm test
npm run test:e2e
npm run test:mutation:ci

# 2. Frontend
cd ../frontend
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

### CI en GitHub Actions

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) ejecuta en push/PR a `main` o `master`:

- **Backend:** `lint:check`, `build`, `test`, `test:e2e`, `test:mutation:ci` (PostgreSQL 16 como servicio).
- **Frontend:** `lint`, `build`.

Node.js **22** en runners; no incluye Playwright E2E (solo build/lint del frontend).

---

## Despliegue en producción

### Backend (Render u homólogo)

1. Crear servicio Web con Node.js.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm run start:prod`
4. Variables de entorno:
   - `DATABASE_URL` — cadena PostgreSQL del proveedor (SSL gestionado en `app.module.ts`).
   - `CORS_ORIGIN` — URL del frontend en producción (y `http://localhost:5173` si aún desarrollas en local).
   - `DB_SYNCHRONIZE=false` en producción (usar migraciones cuando aplique).
   - `PORT` — según el proveedor (Render suele inyectar `PORT` automáticamente).

### Frontend (Vercel u homólogo)

1. **Root directory:** `frontend`
2. **Build command:** `npm run build`
3. **Output directory:** `dist`
4. Variable de entorno:
   - `VITE_API_URL` — URL pública del API desplegado (sin barra final).

---

## URLs de producción

Completa esta sección con tus despliegues reales antes de entregar el proyecto.

| Entorno | Plataforma | URL |
| --- | --- | --- |
| **API (Backend)** | Render | `https://________________.onrender.com` |
| **Aplicación web (Frontend)** | Vercel | `https://________________.vercel.app` |
| **Repositorio** | GitHub | `https://github.com/________________/proyecto-inventario` |

**Health check rápido:** `GET <API_URL>/products` debe responder `200` con JSON (lista vacía `[]` o productos existentes).

---

## Convenciones del proyecto

Las reglas de arquitectura y generación de código están en [`.cursorrules`](.cursorrules):

- Transacciones TypeORM en operaciones que modifican stock.
- DTOs validados en endpoints `POST` / `PATCH`.
- Excepciones NestJS en backend; errores visibles con Axios en frontend.
- Naming: kebab-case en archivos backend; PascalCase en componentes React.

---

## Licencia

Proyecto académico — uso según las políticas del curso *AI for Devs* y del repositorio remoto configurado.

## URLs del Sistema Desplegado
- **Frontend (React):** https://ai-4-de-vs-proyecto-inventario.vercel.app/
- **Backend (NestJS API):** https://ai-4-devs-proyecto-inventario.onrender.com