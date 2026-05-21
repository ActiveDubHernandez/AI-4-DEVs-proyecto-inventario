# Prompts del Curso — proyecto-inventario

Registro de prompts utilizados para la generación y evolución del proyecto.

---

## Fase 1: Generación inicial de requerimientos

**Contexto:** Generación inicial de requerimientos funcionales, técnicos y modelado de negocio basados en las especificaciones del curso.

**Prompt:**

> Actúa como un Product Manager y Arquitecto de Software Senior. Genera la documentación técnica del sistema de gestión de inventario para las carpetas creadas.
>
> Escribe el contenido completo para:
>
> 1. `docs/PRD.md`: Incluye objetivo, alcance, restricciones técnicas (NestJS, React, TypeORM, PostgreSQL) y criterios de aceptación detallados.
> 2. `docs/user-stories.md`: Genera exactamente 6 historias de usuario en formato Gherkin (4 de backend para CRUD de productos, registro de movimientos, cálculo de stock y alertas; 2 de frontend para visualización de lista y formulario).
> 3. `docs/tickets.md`: Desglosa cada historia en un ticket con criterios de aceptación técnicos y formato Markdown.
>
> Genera también el diseño del modelo de datos en texto relacional (Diagrama ER en Mermaid) y arquitectura C4 básica. Dame el código listo para volcar en cada archivo markdown.

**Artefactos generados:**

| Archivo | Contenido |
| --- | --- |
| `docs/PRD.md` | PRD, modelo relacional, ER Mermaid, C4 Context + Container |
| `docs/user-stories.md` | 6 historias Gherkin (US-BE-01 a US-FE-02) |
| `docs/tickets.md` | TICKET-001 a TICKET-006 con AC técnicos |

---

## Fase 2: Creación de entidades y base de datos

**Contexto:** Creación de las entidades de base de datos relacional mitigando condiciones de carrera e impactos en concurrencia.

**Prompt:**

> Basándote en las especificaciones del proyecto y el archivo `.cursorrules`, crea las entidades TypeORM (`Product` y `Movement`) en sus respectivas carpetas (`backend/src/products/entities/product.entity.ts` y `backend/src/movements/entities/movement.entity.ts`).
>
> - **Product:** id (uuid), nombre, descripción, unidadDeMedida (enum: unidades, kg, litros), categoría, stockMinimo (number), estado (boolean: activo/inactivo).
> - **Movement:** id (uuid), tipo (enum: entrada, salida), cantidad (int), fecha (date), razon (enum: compra, venta, ajuste, merma, devolución) y relación ManyToOne con Product.
>
> Configura los módulos e inicializa la conexión PostgreSQL en `app.module.ts`.

**Artefactos generados:**

| Archivo | Contenido |
| --- | --- |
| `backend/src/products/entities/product.entity.ts` | Entidad `Product` + enum `UnitOfMeasure` |
| `backend/src/movements/entities/movement.entity.ts` | Entidad `Movement` + enums tipo/razón |
| `backend/src/products/products.module.ts` | `TypeOrmModule.forFeature([Product])` |
| `backend/src/movements/movements.module.ts` | `TypeOrmModule.forFeature([Movement])` |
| `backend/src/app.module.ts` | `ConfigModule` + `TypeOrmModule.forRootAsync` |
| `backend/.env.example` | Variables de conexión PostgreSQL |

---

## Fase 3: Controladores, servicios y lógica de negocio

**Contexto:** Inyección de lógica de validación crítica en base de datos y endpoints transaccionales.

**Prompt:**

> Implementa por completo los controladores, servicios y DTOs para los módulos `products`, `movements` e `inventory`…
> (reglas de negocio: soft delete, transacción en salidas, stock por agregación, alertas low-stock, filtros de historial).

**Artefactos generados:**

| Área | Endpoints |
| --- | --- |
| `products` | CRUD REST `/products` |
| `movements` | `POST /movements`, `GET /movements` con filtros |
| `inventory` | `GET /inventory/products/:id/stock`, `GET /inventory/alerts/low-stock` |

---

## Fase 4: Conexión de API y pantalla lista de productos

**Contexto:** Consumo de la API de inventario y renderizado de componentes reactivos con alertas visuales.

**Prompt:**

> Implementa `api.ts` con Axios, `StockBadge.tsx`, `ProductList.tsx` y `ProductCard.tsx` consumiendo productos activos y stock en tiempo real.

**Artefactos generados:**

| Archivo | Descripción |
| --- | --- |
| `frontend/src/services/api.ts` | Cliente Axios + fetch productos y stock |
| `frontend/src/components/StockBadge.tsx` | Badge rojo si `stockActual <= stockMinimo` |
| `frontend/src/components/ProductCard.tsx` | Tarjeta de producto con enlace a movimiento |
| `frontend/src/pages/ProductList.tsx` | Lista principal con estados loading/error |
| `frontend/.env.example` | `VITE_API_URL` |

---

## Fase 5: Formulario de registro de movimientos

**Contexto:** Formulario reactivo con validaciones asíncronas en tiempo real previas al envío de cargas útiles.

**Prompt:**

> Implementa `pages/MovementForm.tsx` y `components/MovementForm.tsx` con selectores dinámicos, validación de cantidad, consulta de stock en salidas y `POST /movements`.

**Artefactos generados:**

| Archivo | Descripción |
| --- | --- |
| `frontend/src/components/MovementForm.tsx` | Formulario con validación en tiempo real y bloqueo de envío |
| `frontend/src/pages/MovementForm.tsx` | Página con `productId` desde query string |
| `frontend/src/types/movement.ts` | Tipos del movimiento |
| `frontend/src/services/api.ts` | `createMovement()` |

---

## Fase 6: Pruebas unitarias y PBT (fast-check)

**Contexto:** Robustecimiento de la suite de pruebas mediante testing unitario clásico y PBT.

**Prompt:**

> Genera pruebas Jest + fast-check: mínimo 10 unitarias y propiedades P1 (stock no negativo), P2 (cantidad entera positiva), P3 (stock = entradas - salidas).

**Artefactos generados:**

| Archivo | Tipo |
| --- | --- |
| `products/products.service.spec.ts` | Unitarias CRUD / soft delete |
| `movements/movements.service.spec.ts` | Unitarias transacciones y salidas |
| `inventory/inventory.service.spec.ts` | Unitarias agregación de stock |
| `common/utils/stock.math.ts` | Lógica pura para PBT |
| `common/utils/stock.math.pbt.spec.ts` | P1 y P3 |
| `movements/dto/create-movement.dto.pbt.spec.ts` | P2 validación DTO |
| `movements/movements.service.pbt.spec.ts` | P1 capa servicio |

---

## Fase 7: Mutation Testing (Stryker)

**Contexto:** Medición de la efectividad de los asserts inyectando mutantes sintácticos en la lógica del backend.

**Prompt:**

> Configura `stryker.config.json` con runner Jest y pruebas hyper-específicas para mutantes M3, M4 y M8.

**Artefactos generados:**

| Archivo | Descripción |
| --- | --- |
| `backend/stryker.config.json` | Configuración Stryker + Jest |
| `backend/jest.config.js` | Config Jest dedicada para Stryker |
| `backend/src/critical-mutants.spec.ts` | Tests M3 (límite salida), M4 (tipos), M8 (alerta exacta) |
| `npm run test:mutation` | Ejecuta mutation testing |

---

## Fase 8: Automatización E2E con Playwright

**Contexto:** Simulación de flujos de usuario finales interconectados extremo a extremo.

**Prompt:**

> Crea `frontend/e2e/product-list.spec.ts` y `movement-form.spec.ts` con Playwright cubriendo lista, badges, entrada, salida válida e inválida.

**Artefactos generados:**

| Archivo | Flujo |
| --- | --- |
| `e2e/product-list.spec.ts` | Lista, badges rojo/verde, enlaces interactivos |
| `e2e/movement-form.spec.ts` | Entrada, salida válida, salida inválida bloqueada |
| `e2e/helpers/api-helpers.ts` | Seed y cleanup vía API |
| `playwright.config.ts` | Web servers backend + frontend |

---

## Fase 9: Pipeline CI (GitHub Actions)

**Contexto:** Automatización de integración continua con PostgreSQL, Jest, Stryker y build frontend/backend.

**Artefactos generados:**

| Archivo | Descripción |
| --- | --- |
| `.github/workflows/ci.yml` | CI en push/PR a `main`/`master` |
| `backend/package.json` | Script `lint:check` sin `--fix` |

---

## Fases siguientes (plantillas)

### Fase 10: Formulario de producto (CRUD)

```
Actúa como desarrollador NestJS Senior. Implementa TICKET-001 del archivo docs/tickets.md:
módulo products con TypeORM, PostgreSQL, DTOs validados y convenciones de .cursorrules.
```

### Fase 10: Formulario de producto (CRUD)

```
Implementa el CRUD de productos en /products/new y /products/:id/edit
con validación y alertas Axios.
```
