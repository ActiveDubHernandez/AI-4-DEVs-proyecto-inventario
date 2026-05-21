# Historias de Usuario — Sistema de Gestión de Inventario

Formato: **Gherkin** (Given / When / Then).  
Total: **6 historias** (4 backend, 2 frontend).

---

## US-BE-01 — CRUD de productos

**Como** operador de inventario  
**Quiero** crear, consultar, actualizar y dar de baja productos en el catálogo  
**Para** mantener un registro maestro confiable de los artículos del almacén  

```gherkin
Feature: CRUD de productos
  Como operador de inventario
  Quiero gestionar el catálogo de productos vía API REST
  Para mantener datos maestros consistentes

  Background:
    Dado que la API de inventario está disponible
    Y que la base de datos PostgreSQL está conectada

  Scenario: Crear un producto válido
    Cuando envío una petición POST a "/products" con el cuerpo:
      | sku      | PROD-001        |
      | name     | Tornillo M6     |
      | unitPrice| 0.50            |
      | minStock | 100             |
    Entonces recibo el código de estado 201
    Y la respuesta contiene un "id" generado
    Y el "sku" es "PROD-001"

  Scenario: Rechazar SKU duplicado
    Dado que existe un producto con sku "PROD-001"
    Cuando envío POST a "/products" con sku "PROD-001"
    Entonces recibo el código de estado 409
    Y el mensaje de error indica que el SKU ya existe

  Scenario: Listar productos
    Dado que existen al menos 2 productos activos
    Cuando envío GET a "/products"
    Entonces recibo el código de estado 200
    Y el cuerpo es un arreglo con al menos 2 elementos
    Y cada elemento incluye "id", "sku", "name" y "minStock"

  Scenario: Actualizar un producto existente
    Dado que existe un producto con id "{productId}"
    Cuando envío PATCH a "/products/{productId}" con:
      | name     | Tornillo M6 galvanizado |
      | minStock | 150                     |
    Entonces recibo el código de estado 200
    Y "name" en la respuesta es "Tornillo M6 galvanizado"
    Y "minStock" en la respuesta es 150

  Scenario: Producto no encontrado
    Cuando envío GET a "/products/00000000-0000-0000-0000-000000000000"
    Entonces recibo el código de estado 404
```

---

## US-BE-02 — Registro de movimientos de inventario

**Como** operador de inventario  
**Quiero** registrar entradas y salidas de stock asociadas a un producto  
**Para** auditar cada cambio de inventario con trazabilidad  

```gherkin
Feature: Registro de movimientos de inventario
  Como operador de inventario
  Quiero registrar entradas y salidas de stock
  Para mantener trazabilidad de cada cambio

  Background:
    Dado que existe un producto activo con id "{productId}" y stock actual 50

  Scenario: Registrar una entrada de stock
    Cuando envío POST a "/stock-movements" con el cuerpo:
      | productId    | {productId} |
      | movementType | ENTRY       |
      | quantity     | 30          |
      | referenceNote| Compra #4521|
    Entonces recibo el código de estado 201
    Y la respuesta incluye "movementType" igual a "ENTRY"
    Y la respuesta incluye "quantity" igual a 30

  Scenario: Registrar una salida válida
    Cuando envío POST a "/stock-movements" con:
      | productId    | {productId} |
      | movementType | EXIT        |
      | quantity     | 20          |
    Entonces recibo el código de estado 201

  Scenario: Rechazar salida que dejaría stock negativo
    Dado que el stock actual del producto es 50
    Cuando envío POST a "/stock-movements" con movementType "EXIT" y quantity 60
    Entonces recibo el código de estado 400
    Y el mensaje indica stock insuficiente

  Scenario: Rechazar cantidad inválida
    Cuando envío POST a "/stock-movements" con quantity 0
    Entonces recibo el código de estado 400

  Scenario: Rechazar producto inexistente
    Cuando envío POST a "/stock-movements" con productId "00000000-0000-0000-0000-000000000000"
    Entonces recibo el código de estado 404
```

---

## US-BE-03 — Cálculo de stock actual

**Como** supervisor de almacén  
**Quiero** consultar el stock actual de un producto calculado desde sus movimientos  
**Para** tomar decisiones de reposición con datos precisos  

```gherkin
Feature: Cálculo de stock actual
  Como supervisor de almacén
  Quiero consultar el stock derivado de movimientos
  Para conocer la disponibilidad real

  Scenario: Stock con entradas y salidas
    Dado que el producto "{productId}" tiene los movimientos:
      | movementType | quantity |
      | ENTRY        | 100      |
      | ENTRY        | 50       |
      | EXIT         | 30       |
    Cuando envío GET a "/products/{productId}/stock"
    Entonces recibo el código de estado 200
    Y "currentStock" en la respuesta es 120
    Y "productId" en la respuesta es "{productId}"

  Scenario: Stock cero sin movimientos
    Dado que el producto "{productId}" no tiene movimientos registrados
    Cuando envío GET a "/products/{productId}/stock"
    Entonces recibo el código de estado 200
    Y "currentStock" es 0

  Scenario: Indicador de stock bajo mínimo
    Dado que el producto tiene minStock 100 y stock actual 80
    Cuando envío GET a "/products/{productId}/stock"
    Entonces "isBelowMinimum" en la respuesta es true

  Scenario: Producto no encontrado al consultar stock
    Cuando envío GET a "/products/00000000-0000-0000-0000-000000000000/stock"
    Entonces recibo el código de estado 404
```

---

## US-BE-04 — Alertas de stock bajo

**Como** supervisor de almacén  
**Quiero** obtener un listado de productos cuyo stock está en o por debajo del mínimo  
**Para** priorizar pedidos de reposición antes del quiebre  

```gherkin
Feature: Alertas de stock bajo
  Como supervisor de almacén
  Quiero listar productos en alerta de stock
  Para actuar antes del desabastecimiento

  Scenario: Listar productos bajo el umbral mínimo
    Dado que existen productos activos con los siguientes estados:
      | sku      | minStock | stock actual |
      | LOW-01   | 50       | 30           |
      | OK-01    | 50       | 200          |
      | LOW-02   | 10       | 10           |
    Cuando envío GET a "/alerts/low-stock"
    Entonces recibo el código de estado 200
    Y el arreglo contiene exactamente los productos "LOW-01" y "LOW-02"
    Y cada elemento incluye "sku", "name", "currentStock" y "minStock"

  Scenario: Lista vacía cuando no hay alertas
    Dado que todos los productos activos tienen stock mayor a su minStock
    Cuando envío GET a "/alerts/low-stock"
    Entonces recibo el código de estado 200
    Y el arreglo está vacío

  Scenario: Excluir productos inactivos
    Dado que existe un producto inactivo con stock 0 y minStock 100
    Cuando envío GET a "/alerts/low-stock"
    Entonces ese producto no aparece en el arreglo
```

---

## US-FE-01 — Visualización de lista de productos

**Como** operador de inventario  
**Quiero** ver una tabla con todos los productos y su estado de stock  
**Para** identificar rápidamente qué artículos requieren atención  

```gherkin
Feature: Lista de productos en el frontend
  Como operador de inventario
  Quiero ver la lista de productos en la aplicación web
  Para monitorear el inventario de un vistazo

  Background:
    Dado que el frontend React está ejecutándose
    Y que la API devuelve productos de prueba

  Scenario: Mostrar tabla de productos
    Cuando navego a la ruta "/products"
    Entonces veo una tabla con columnas "SKU", "Nombre", "Stock" y "Mínimo"
    Y cada fila muestra los datos de un producto

  Scenario: Resaltar productos en alerta
    Dado que el producto "LOW-01" tiene stock por debajo del mínimo
    Cuando la lista se renderiza
    Entonces la fila de "LOW-01" muestra un indicador visual de alerta

  Scenario: Manejar error de carga
    Dado que la API no está disponible
    Cuando navego a "/products"
    Entonces veo un mensaje de error visible al usuario
    Y no se muestra una tabla vacía sin explicación

  Scenario: Navegar al formulario de creación
    Cuando hago clic en el botón "Nuevo producto"
    Entonces soy redirigido a "/products/new"
```

---

## US-FE-02 — Formulario de producto (crear y editar)

**Como** operador de inventario  
**Quiero** un formulario para crear y editar productos  
**Para** mantener el catálogo sin usar herramientas técnicas  

```gherkin
Feature: Formulario de producto
  Como operador de inventario
  Quiero crear y editar productos desde la interfaz
  Para administrar el catálogo de forma amigable

  Scenario: Crear producto exitosamente
    Cuando navego a "/products/new"
    Y completo los campos:
      | campo     | valor        |
      | sku       | FE-PROD-001  |
      | name      | Cable UTP 5m |
      | unitPrice | 12.99        |
      | minStock  | 25           |
    Y envío el formulario
    Entonces veo un mensaje de éxito
    Y soy redirigido a la lista de productos
    Y el nuevo producto aparece en la tabla

  Scenario: Validación de campos obligatorios
    Cuando navego a "/products/new"
    Y envío el formulario sin completar "sku" ni "name"
    Entonces veo mensajes de validación en los campos requeridos
    Y no se realiza la petición POST a la API

  Scenario: Editar producto existente
    Dado que existe el producto "FE-PROD-001"
    Cuando navego a "/products/{id}/edit"
    Y cambio "minStock" a 40
    Y envío el formulario
    Entonces veo un mensaje de éxito
    Y en la lista el producto muestra mínimo 40

  Scenario: Mostrar error de API en el formulario
    Dado que envío un SKU duplicado
    Cuando envío el formulario
    Entonces veo el mensaje de error devuelto por la API
```

---

## Trazabilidad

| Historia | Ticket |
| --- | --- |
| US-BE-01 | [TICKET-001](./tickets.md#ticket-001--crud-de-productos-backend) |
| US-BE-02 | [TICKET-002](./tickets.md#ticket-002--registro-de-movimientos-de-stock-backend) |
| US-BE-03 | [TICKET-003](./tickets.md#ticket-003--cálculo-de-stock-actual-backend) |
| US-BE-04 | [TICKET-004](./tickets.md#ticket-004--alertas-de-stock-bajo-backend) |
| US-FE-01 | [TICKET-005](./tickets.md#ticket-005--lista-de-productos-frontend) |
| US-FE-02 | [TICKET-006](./tickets.md#ticket-006--formulario-de-producto-frontend) |
