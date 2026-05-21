# Tickets de Implementación — Sistema de Gestión de Inventario

Desglose técnico de las 6 historias de usuario. Cada ticket incluye estimación sugerida, dependencias y criterios de aceptación verificables.

---

## TICKET-001 — CRUD de productos (Backend)

| Campo | Valor |
| --- | --- |
| **ID** | TICKET-001 |
| **Historia** | [US-BE-01](./user-stories.md#us-be-01--crud-de-productos) |
| **Tipo** | Feature |
| **Prioridad** | Alta |
| **Estimación** | 5 pts |
| **Dependencias** | Configuración TypeORM + PostgreSQL |

### Descripción

Implementar el módulo `products` en NestJS con entidad TypeORM, DTOs validados, servicio y controlador REST para el ciclo de vida completo del catálogo.

### Tareas técnicas

- [ ] Crear entidad `Product` (`products` table) con migración inicial.
- [ ] DTOs: `CreateProductDto`, `UpdateProductDto` con `class-validator`.
- [ ] `ProductsService`: create, findAll, findOne, update, remove (baja lógica `isActive = false`).
- [ ] `ProductsController`: rutas REST estándar.
- [ ] Validar unicidad de `sku` → `ConflictException`.
- [ ] `NotFoundException` para id inexistente.

### Criterios de aceptación técnicos

| # | Criterio | Verificación |
| --- | --- | --- |
| T1.1 | `POST /products` persiste registro y retorna `201` | Postman / e2e |
| T1.2 | `sku` duplicado retorna `409` | Test unitario + manual |
| T1.3 | `GET /products` retorna array de productos activos | Postman |
| T1.4 | `GET /products/:id` retorna `404` si no existe | Test e2e |
| T1.5 | `PATCH /products/:id` actualiza solo campos enviados | Postman |
| T1.6 | `DELETE /products/:id` marca `isActive=false` | Query DB |
| T1.7 | Payload inválido retorna `400` con detalle de validación | Postman |
| T1.8 | Archivos en kebab-case; clases en CamelCase | Revisión de código |

### Estructura de archivos esperada

```
backend/src/products/
├── products.module.ts
├── products.controller.ts
├── products.service.ts
├── entities/product.entity.ts
└── dto/
    ├── create-product.dto.ts
    └── update-product.dto.ts
```

---

## TICKET-002 — Registro de movimientos de stock (Backend)

| Campo | Valor |
| --- | --- |
| **ID** | TICKET-002 |
| **Historia** | [US-BE-02](./user-stories.md#us-be-02--registro-de-movimientos-de-inventario) |
| **Tipo** | Feature |
| **Prioridad** | Alta |
| **Estimación** | 8 pts |
| **Dependencias** | TICKET-001 |

### Descripción

Implementar `stock-movements` para registrar `ENTRY` y `EXIT`, validando stock suficiente en salidas dentro de una transacción TypeORM.

### Tareas técnicas

- [ ] Entidad `StockMovement` con enum `MovementType` (`ENTRY`, `EXIT`).
- [ ] DTO `CreateStockMovementDto` con validaciones (`quantity` > 0, UUID válido).
- [ ] `StockMovementsService.create()` usando `DataSource.transaction`.
- [ ] Dentro de la transacción: calcular stock actual, validar salida, insertar movimiento.
- [ ] Rechazar movimientos sobre productos inactivos → `BadRequestException`.
- [ ] FK `product_id` con `ON DELETE RESTRICT`.

### Criterios de aceptación técnicos

| # | Criterio | Verificación |
| --- | --- | --- |
| T2.1 | `POST /stock-movements` con `ENTRY` retorna `201` | Postman |
| T2.2 | `EXIT` con stock suficiente retorna `201` | Postman |
| T2.3 | `EXIT` que deja stock negativo retorna `400` | Test e2e |
| T2.4 | `quantity <= 0` retorna `400` | Test unitario DTO |
| T2.5 | `productId` inexistente retorna `404` | Postman |
| T2.6 | Toda la lógica de escritura está en `transaction()` | Revisión código |
| T2.7 | Movimiento persiste `referenceNote` opcional | Query DB |

### Contrato de respuesta (ejemplo)

```json
{
  "id": "uuid",
  "productId": "uuid",
  "movementType": "ENTRY",
  "quantity": 30,
  "referenceNote": "Compra #4521",
  "createdAt": "2026-05-19T12:00:00.000Z"
}
```

---

## TICKET-003 — Cálculo de stock actual (Backend)

| Campo | Valor |
| --- | --- |
| **ID** | TICKET-003 |
| **Historia** | [US-BE-03](./user-stories.md#us-be-03--cálculo-de-stock-actual) |
| **Tipo** | Feature |
| **Prioridad** | Alta |
| **Estimación** | 3 pts |
| **Dependencias** | TICKET-002 |

### Descripción

Exponer endpoint para consultar stock calculado dinámicamente desde `stock_movements` y flag `isBelowMinimum`.

### Tareas técnicas

- [ ] Método `calculateCurrentStock(productId, manager?)` reutilizable en servicio.
- [ ] Query agregada: `SUM(CASE WHEN type=ENTRY THEN qty ELSE -qty END)`.
- [ ] Endpoint `GET /products/:id/stock` en `ProductsController` o servicio dedicado.
- [ ] DTO de respuesta `ProductStockResponseDto`.

### Criterios de aceptación técnicos

| # | Criterio | Verificación |
| --- | --- | --- |
| T3.1 | Fórmula: entradas − salidas = `currentStock` | Test con datos semilla |
| T3.2 | Sin movimientos → `currentStock = 0` | Postman |
| T3.3 | `isBelowMinimum = currentStock <= minStock` | Test unitario |
| T3.4 | Producto inexistente → `404` | Postman |
| T3.5 | Método reutilizado por TICKET-002 y TICKET-004 | Revisión código |

### Contrato de respuesta (ejemplo)

```json
{
  "productId": "uuid",
  "currentStock": 120,
  "minStock": 100,
  "isBelowMinimum": false
}
```

---

## TICKET-004 — Alertas de stock bajo (Backend)

| Campo | Valor |
| --- | --- |
| **ID** | TICKET-004 |
| **Historia** | [US-BE-04](./user-stories.md#us-be-04--alertas-de-stock-bajo) |
| **Tipo** | Feature |
| **Prioridad** | Media |
| **Estimación** | 3 pts |
| **Dependencias** | TICKET-003 |

### Descripción

Módulo `alerts` con endpoint que devuelve productos activos en situación de alerta.

### Tareas técnicas

- [ ] `AlertsModule`, `AlertsController`, `AlertsService`.
- [ ] `GET /alerts/low-stock` con query que une `products` + agregación de movimientos.
- [ ] Filtrar `is_active = true` y `current_stock <= min_stock`.
- [ ] Ordenar por `currentStock` ascendente (opcional).

### Criterios de aceptación técnicos

| # | Criterio | Verificación |
| --- | --- | --- |
| T4.1 | Solo productos con stock ≤ mínimo | Test con fixtures |
| T4.2 | Productos inactivos excluidos | Query + Postman |
| T4.3 | Respuesta incluye `sku`, `name`, `currentStock`, `minStock` | Contrato JSON |
| T4.4 | Sin alertas → `200` con `[]` | Postman |
| T4.5 | Stock en límite (`current === min`) incluido | Test unitario |

---

## TICKET-005 — Lista de productos (Frontend)

| Campo | Valor |
| --- | --- |
| **ID** | TICKET-005 |
| **Historia** | [US-FE-01](./user-stories.md#us-fe-01--visualización-de-lista-de-productos) |
| **Tipo** | Feature |
| **Prioridad** | Alta |
| **Estimación** | 5 pts |
| **Dependencias** | TICKET-001, TICKET-003 (enriquecimiento opcional) |

### Descripción

Página `ProductList` en React que consume la API y muestra inventario con indicadores de alerta.

### Tareas técnicas

- [ ] Instalar y configurar Axios con `baseURL` desde variable de entorno.
- [ ] Servicio `productApi.ts` con `getProducts()`.
- [ ] Componente `ProductList.tsx` (PascalCase) y ruta `/products`.
- [ ] Tabla con columnas: SKU, Nombre, Stock actual, Mínimo, Estado.
- [ ] Badge o clase CSS para filas en alerta (`isBelowMinimum` o comparación local).
- [ ] Estados: loading, error (alerta visible), empty state.
- [ ] Botón "Nuevo producto" → `/products/new`.

### Criterios de aceptación técnicos

| # | Criterio | Verificación |
| --- | --- | --- |
| T5.1 | Lista carga datos de `GET /products` al montar | DevTools Network |
| T5.2 | Error de red muestra mensaje al usuario | Simular API caída |
| T5.3 | Fila en alerta tiene estilo distintivo | Inspección UI |
| T5.4 | Loading spinner o skeleton mientras carga | Manual |
| T5.5 | Navegación a formulario de creación funciona | Click test |

### Estructura sugerida

```
frontend/src/
├── pages/ProductList.tsx
├── components/ProductTable.tsx
├── services/productApi.ts
└── types/product.ts
```

---

## TICKET-006 — Formulario de producto (Frontend)

| Campo | Valor |
| --- | --- |
| **ID** | TICKET-006 |
| **Historia** | [US-FE-02](./user-stories.md#us-fe-02--formulario-de-producto-crear-y-editar) |
| **Tipo** | Feature |
| **Prioridad** | Alta |
| **Estimación** | 5 pts |
| **Dependencias** | TICKET-005 |

### Descripción

Formulario reutilizable para crear (`/products/new`) y editar (`/products/:id/edit`) productos con validación cliente y manejo de errores Axios.

### Tareas técnicas

- [ ] Componente `ProductForm.tsx` con estado controlado.
- [ ] Validación HTML5 o librería ligera antes de submit.
- [ ] `POST /products` en modo creación; `PATCH /products/:id` en edición.
- [ ] Cargar datos existentes en edición con `GET /products/:id`.
- [ ] `catch` Axios: mostrar `response.data.message` en alerta/toast.
- [ ] Redirección a `/products` tras éxito.

### Criterios de aceptación técnicos

| # | Criterio | Verificación |
| --- | --- | --- |
| T6.1 | Crear producto válido redirige a lista | Flujo manual |
| T6.2 | Campos vacíos bloquean submit con mensaje | Manual |
| T6.3 | SKU duplicado muestra error de API | Postman + UI |
| T6.4 | Edición precarga valores del producto | DevTools |
| T6.5 | `unitPrice` y `minStock` rechazan negativos en UI | Manual |
| T6.6 | Variables en camelCase en TypeScript | Linter |

---

## Resumen del backlog

| Ticket | Módulo | Puntos | Sprint sugerido |
| --- | --- | --- | --- |
| TICKET-001 | Backend — products | 5 | 1 |
| TICKET-002 | Backend — stock-movements | 8 | 2 |
| TICKET-003 | Backend — stock query | 3 | 2 |
| TICKET-004 | Backend — alerts | 3 | 2 |
| TICKET-005 | Frontend — lista | 5 | 3 |
| TICKET-006 | Frontend — formulario | 5 | 3 |
| **Total** | | **29** | |

---

## Definición de Hecho (DoD) global

- [ ] Código mergeado en rama principal del equipo sin errores de lint.
- [ ] DTOs validados en endpoints POST/PATCH.
- [ ] Movimientos de inventario usan transacción TypeORM.
- [ ] Prueba manual documentada en comentario del PR o checklist.
- [ ] Sin secretos en el repositorio.

---

## Referencias

- PRD: [PRD.md](./PRD.md)
- Historias: [user-stories.md](./user-stories.md)
- Convenciones: [`.cursorrules`](../.cursorrules)
