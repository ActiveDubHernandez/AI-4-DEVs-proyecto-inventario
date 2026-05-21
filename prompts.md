# Prompts del Curso — Sistema de Gestión de Inventario (AI4DEVs)

Registro oficial e histórico de los prompts reales utilizados durante las sesiones iterativas con la IA (Cursor Composer y Chat) para el desarrollo, depuración, testing y despliegue del proyecto final.

---

## 📅 Día 1 & 2: Documentación de Requerimientos y Configuración del Entorno

**Contexto de Uso:** Generación inicial de la visión de negocio, requerimientos técnicos, historias de usuario e infraestructura base de la base de datos basándose en el enunciado general.

### Prompt Exacto Enviado:
> Actúa como un Product Manager y Arquitecto de Software Senior. Genera la documentación técnica del sistema de gestión de inventario para las carpetas creadas. 
> Escribe el contenido completo para:
> 1. `docs/PRD.md`: Incluye objetivo, alcance, restricciones técnicas (NestJS, React, TypeORM, PostgreSQL) y criterios de aceptación detallados.
> 2. `docs/user-stories.md`: Genera exactamente 6 historias de usuario en formato Gherkin (4 de backend para CRUD de productos, registro de movimientos, cálculo de stock y alertas; 2 de frontend para visualización de lista y formulario).
> 3. `docs/tickets.md`: Desglosa cada historia en un ticket con criterios de aceptación técnicos y formato Markdown.
> Genera también el diseño del modelo de datos en texto relacional (Diagrama ER en Mermaid) y arquitectura C4 básica. Dame el código listo para volcar en cada archivo markdown.

### Prompt de Modelado de Entidades:
> Basándote en las especificaciones del proyecto y el archivo `.cursorrules`, crea las entidades TypeORM (`Product` y `Movement`) en sus respectivas carpetas (`backend/src/products/entities/product.entity.ts` y `backend/src/movements/entities/movement.entity.ts`). 
> - `Product`: id (uuid), nombre, descripción, unidadDeMedida (enum: unidades, kg, litros), categoría, stockMinimo (number), estado (boolean: activo/inactivo).
> - `Movement`: id (uuid), tipo (enum: entrada, salida), cantidad (int), fecha (date), razon (enum: compra, venta, ajuste, merma, devolución) y relación ManyToOne con Product.
> Configura los módulos e inicializa la conexión PostgreSQL en `app.module.ts`.

**Reflexión y Refinamiento:** La IA estructuró la documentación en Gherkin de forma impecable. El uso de Cursor Composer facilitó la creación en paralelo de las dos entidades y los módulos iniciales de NestJS respetando Clean Architecture sin perder tiempo tipeando código base.

---

## 📅 Día 3 & 4: Desarrollo del Backend y Lógica de Negocio

**Contexto de Uso:** Implementación transaccional de los servicios del servidor, inyección de validaciones críticas en base de datos para evitar inconsistencias numéricas y condiciones de carrera.

### Prompt Exacto Enviado:
> Implementa por completo los controladores, servicios y DTOs para los módulos `products`, `movements` e `inventory` siguiendo la estructura definida en la imagen del árbol de directorios. Debes cumplir rigurosamente con las siguientes reglas de negocio:
> 1. Un producto NO puede ser eliminado físicamente si tiene movimientos asociados; el método DELETE debe cambiar su estado a inactivo.
> 2. El registro de un movimiento de tipo 'salida' debe validar mediante una Transacción de TypeORM que la cantidad no supere el stock actual disponible para garantizar consistencia ante peticiones simultáneas.
> 3. El módulo `inventory` debe calcular el stock en tiempo real usando funciones de agregación (suma de entradas menos suma de salidas).
> 4. Implementa el endpoint `/inventory/alerts/low-stock` que devuelva los productos cuyo stock actual sea menor o igual a su stock mínimo configurado.
> 5. El historial de movimientos debe permitir filtrar dinámicamente por producto, tipo de movimiento y rango de fechas, validando que fechaInicio no sea posterior a fechaFin.
> Genera todo el código de producción listo.

**Reflexión y Refinamiento:** Fue necesario insistir mediante contexto en que el cálculo del inventario combinara correctamente las funciones `SUM` agrupadas por ID. La solución transaccional con `DataSource.transaction` blindó el endpoint críticamente contra stocks negativos simulados simultáneamente.

---

## 📅 Día 5 & 6: Desarrollo del Frontend en React (Lista y Formulario)

**Contexto de Uso:** Creación de componentes reactivos en TypeScript, consumo asíncrono de endpoints y maquetación de lógica de alertas visuales en tiempo real.

### Prompt de la Pantalla de Productos:
> Actúa como un Desarrollador Frontend Senior en React + TypeScript + Vite. Vamos a crear los componentes base del sistema:
> 1. Implementa `frontend/src/services/api.ts` usando Axios configurado para conectarse al backend.
> 2. Crea el componente `frontend/src/components/StockBadge.tsx` que reciba el stock actual y el stock mínimo. Si el stockActual <= stockMinimo, debe renderizar un badge visual rojo de alerta de peligro.
> 3. Crea la página principal `frontend/src/pages/ProductList.tsx` y su componente de soporte `ProductCard.tsx`. Debe listar todos los productos activos consumiendo el endpoint del backend, mostrando nombre, categoría, unidad de medida, stock actual y el `StockBadge`. Debe incluir un botón para ir a registrar un movimiento para ese producto específico.

### Prompt del Formulario de Movimientos:
> Implementa la página `frontend/src/pages/MovementForm.tsx` junto con su componente interno `frontend/src/components/MovementForm.tsx`. 
> Requisitos del formulario:
> - Selectores dinámicos para elegir el producto, el tipo de movimiento (entrada/salida) y la razón del movimiento.
> - Campo de cantidad con validación en tiempo real: debe ser un entero positivo superior a cero.
> - Si el usuario selecciona 'salida', el componente debe consultar inmediatamente al endpoint `/inventory/:productId` del backend, mostrar de forma clara el stock disponible y validar que la cantidad ingresada por el usuario no supere dicho límite. Si lo supera, se bloquea el botón de enviar y se muestra un mensaje de error.
> - Al hacer submit exitoso contra `POST /movements`, debe dar feedback visual positivo y redirigir al usuario a la lista de productos.

**Reflexión y Refinamiento:** El uso de Axios interceptó adecuadamente el flujo asíncrono. La reactividad al cambiar el switch a 'salida' demostró una excelente experiencia de usuario (UX) al deshabilitar el botón de envío inmediatamente si el inventario local es insuficiente.

---

## 📅 Día 8: Pruebas Unitarias y Property Based Testing (PBT)

**Contexto de Uso:** Verificación matemática y determinista de las reglas universales del negocio usando inputs y secuencias de datos aleatorios.

### Prompt Exacto Enviado:
> Genera la suite completa de pruebas para el backend utilizando Jest y fast-check:
> 1. Escribe un mínimo de 10 pruebas unitarias en Jest cubriendo: el flujo feliz de creación de productos, el bloqueo de eliminación física de productos con movimientos, desactivación lógica, transacciones en salidas exitosas y errores cuando la cantidad supera el stock real.
> 2. Implementa de forma explícita Property Based Testing (PBT) con la librería `fast-check` para verificar estas 3 propiedades críticas del negocio indicadas en el PDF:
>    - P1 (Stock nunca negativo): Ninguna combinación de salidas simuladas aleatorias puede dejar el inventario final por debajo de cero.
>    - P2 (Cantidad siempre entera positiva): El sistema rechaza de forma determinista inputs de cantidades <= 0 o decimales.
>    - P3 (Stock consistente con movimientos): El stock calculado debe coincidir matemáticamente de forma exacta con la fórmula: Suma de Entradas - Suma de Salidas.
> Entrégame los archivos de pruebas `.spec.ts` estructurados.

**Reflexión y Refinamiento:** Fast-check descubrió inicialmente un caso borde con valores flotantes no controlados en la entrada de datos. Se refinó el backend agregando un pipe de validación global (`ParseIntPipe` / `IsInt`) para forzar tipos enteros estrictos antes de que la lógica de TypeORM procesara la consulta.

---

## 📅 Día 9: Robustecimiento de Asserts mediante Mutation Testing (Stryker)

**Contexto de Uso:** Evaluación del nivel de cobertura real de los asserts mediante la inyección de mutantes matemáticos y lógicos en el código compilado del backend.

### Prompt Exacto Enviado:
> Escribe el archivo de configuración ideal `stryker.config.json` para ejecutar mutation testing sobre el backend de NestJS utilizando el runner de Jest. Además, escribe pruebas unitarias hyper-específicas orientadas a matar preventivamente los mutantes críticos definidos en la guía del curso:
> - M3 (Validación de salida): Asegurar que se rechacen los casos en donde se intente retirar una cantidad exactamente igual a `stockActual + 1` y que pase perfectamente cuando sea exactamente igual a `stockActual`.
> - M4 (Tipo de movimiento): Garantizar que un test verifique que las entradas sumen y las salidas resten de manera estricta y aislada.
> - M8 (Alerta de stock mínimo): Prueba específica que valide que un producto con stock idéntico al stock mínimo active la alerta de manera exacta.

**Reflexión y Refinamiento:** Stryker arrojó originalmente un mutante vivo en la condición de frontera del operador `<=`. La suite se fortaleció escribiendo un caso unitario exacto para el valor idéntico (`stock === stockMinimo`), elevando el mutation score por encima del 75% requerido por el curso.

---

## 📅 Día 10: Pruebas de Extremo a Extremo (E2E) con Playwright

**Contexto de Uso:** Simulación automatizada y simbiótica de flujos completos de usuario final en navegadores Chromium sobre la interfaz real enlazada al servidor web.

### Prompt Exacto Enviado:
> Crea los archivos de pruebas automatizadas E2E en la carpeta `frontend/e2e/` utilizando Playwright (`product-list.spec.ts` y `movement-form.spec.ts`). Debes modelar por completo el flujo mínimo esperado por la rúbrica:
> 1. Navegación a la lista de productos y verificación de carga de componentes interactivos y badges de color rojo en productos bajo stock mínimo.
> 2. Navegación al formulario, selección de producto e inserción exitosa de una Entrada de stock, verificando la posterior actualización numérica en el listado.
> 3. Registro de una Salida válida y su correcto descuento numérico.
> 4. Intento de una Salida inválida que supere el stock disponible del producto, verificando que la interfaz de usuario capture el evento, bloquee el envío y lance un texto de error explícito en pantalla.

**Reflexión y Refinamiento:** Playwright fallaba inicialmente en local debido a un error de base de datos no disponible (`ECONNREFUSED` puerto 5432). Se solucionó asegurando la ejecución de una instancia PostgreSQL mediante Docker Desktop en Windows 11 antes de lanzar los tests.

---

## 🔧 Refactorización, Despliegue en la Nube y Soporte Multi-Entorno

**Contexto de Uso:** Resolución de errores en tiempo de despliegue en producción para mitigar problemas de CORS, bases de datos remotas en Render y asertividad de estados vacíos.

### Prompt para Conexión Híbrida de Base de Datos (TypeORM):
> Revisa el archivo `backend/src/app.module.ts`. Actualmente, el `TypeOrmModule` está configurado leyendo las variables de entorno por separado (`DB_HOST`, `DB_PORT`, etc.). 
> Modifica la configuración de TypeORM para que intente leer PRIMERO la variable `process.env.DATABASE_URL` (que es la que usa Render en producción). Si `DATABASE_URL` existe, debe usarla directamente mediante la propiedad `url: process.env.DATABASE_URL`. Si no existe, que use por defecto los campos separados (`host`, `port`, `username`, `password`, `database`) que tenemos para el entorno local. 
> Asegúrate de activar `ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false` para que la base de datos remota de Render no rechace la conexión por falta de SSL.

### Prompt para Habilitar CORS y Resolver Bloqueos de Navegador:
> El frontend en Vercel recibe un 200 OK pero la respuesta viene vacía (Failed to load response data). Esto se debe a un problema de CORS o a que el controlador no está retornando un JSON válido.
> Revisa el archivo `backend/src/main.ts` y asegúrate de que tenga activado `app.enableCors()` antes del `app.listen()`. Configúralo para que acepte cualquier origen o específicamente el dominio de Vercel. 
> Además, revisa el archivo `backend/src/inventory/inventory.controller.ts` (en el endpoint GET `/inventory`) y asegúrate de que el método devuelva explícitamente el resultado del servicio (`return this.inventoryService.findAll()`) y no se quede sin un `return`.

### Prompt para Manejo de Estados de Inventario Vacío:
> El frontend en Vercel ya se conecta con éxito al backend en Render (da un Status Code 200 OK). Sin embargo, está saltando la alerta de 'No se pudo conectar con el servidor'. Esto pasa porque la respuesta del backend es un arreglo vacío `[]` (ya que la base de datos de producción no tiene datos aún) y el frontend lo está tratando erróneamente como un fallo.
> Revisa el archivo `frontend/src/pages/ProductList.tsx`. Ajusta la lógica del `catch` o de la validación de la respuesta de Axios para que:
> 1. Solo muestre el mensaje de error si la petición de verdad falló (ej. status diferente a 2xx o error de red).
> 2. Si la respuesta es exitosa (status 200) pero el arreglo de productos viene vacío (`data.length === 0`), muestre en la interfaz un mensaje limpio en pantalla que diga 'No hay productos registrados en el inventario. ¡Crea el primero!'.

### Prompt de Navegación Global (UX Completa):
> Como el inventario actualmente está vacío, no se muestra ningún producto y por lo tanto no hay forma de hacer clic en los botones internos de las tarjetas para ir al formulario de movimientos (`MovementForm`). El PRD exige que ambas pantallas sean accesibles.
> Modifica el archivo `frontend/src/pages/ProductList.tsx` para agregar un botón o enlace global en la parte superior que diga 'Registrar un Movimiento'. Este botón debe estar visible SIEMPRE (tanto si hay productos como si el inventario está vacío) y debe usar el enrutador (`react-router-dom`) para llevar al usuario a la ruta del formulario `/movement`.

### Prompt de Limpieza Final de Código (Linting):
> Actúa como un Desarrollador Full-Stack Senior experto en NestJS, React, TypeScript y ESLint. Necesito que revises y corrijas de forma automática todos los problemas y advertencias de Lint (Linter) que existan en el proyecto, tanto en la carpeta `backend` como en `frontend`.
> Corrijo problemas de variables no usadas (`no-unused-vars`), importaciones muertas y tipados implícitos en `any` que rompan las ejecuciones automáticas del pipeline de CI de GitHub Actions.

**Reflexión y Refinamiento:** Esta etapa fue clave para la estabilidad productiva de la aplicación. Al habilitar los orígenes cruzados (CORS) y flexibilizar el procesado de respuestas en Axios frente a arreglos vacíos `[]`, el flujo pasó de romperse silenciosamente en el navegador a renderizar un mensaje dinámico e interactivo impecable. El Linter quedó optimizado, permitiendo un paso exitoso por el workflow automatizado de integración continua.