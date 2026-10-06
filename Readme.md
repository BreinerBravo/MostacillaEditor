# 1. Objetivo del sistema

Construir una aplicación web/PWA que permita a una persona diseñar visualmente una manilla tejida de mostacillas mediante una cuadrícula interactiva.

El usuario podrá:

* Crear una nueva manilla.
* Definir ancho y largo del patrón.
* Agregar, modificar y eliminar colores.
* Pintar mostacillas individualmente.
* Pintar arrastrando el dedo o mouse.
* Borrar mostacillas.
* Rellenar áreas.
* Seleccionar y reemplazar colores.
* Deshacer y rehacer cambios.
* Hacer zoom.
* Moverse por patrones grandes.
* Guardar automáticamente.
* Cerrar el navegador y continuar posteriormente.
* Trabajar sin conexión.
* Exportar un diseño.
* Importar un diseño.
* Duplicar diseños.
* Crear diferentes versiones de un diseño.
* Definir el sentido de tejido.
* Entrar en modo "Tejer".
* Avanzar mostacilla por mostacilla.
* Avanzar por fila o columna.
* Retroceder.
* Saltar a cualquier posición.
* Guardar automáticamente el progreso.
* Reanudar el tejido posteriormente.

El sistema debe priorizar:

* simplicidad,
* precisión,
* velocidad,
* funcionamiento offline,
* experiencia móvil,
* prevención de pérdida de información,
* accesibilidad,
* mantenibilidad del código.

---

# 2. Concepto principal

La aplicación no debe pensar en el patrón como una imagen.

Debe pensar en él como una estructura matemática:

```text
Patrón
 ├── dimensiones
 ├── paleta
 ├── celdas
 ├── orientación
 ├── configuración de tejido
 └── progreso
```

Por ejemplo:

```text
     1  2  3  4  5  6
   ┌──┬──┬──┬──┬──┬──┐
1  │ A│ A│ B│ B│ A│ A│
   ├──┼──┼──┼──┼──┼──┤
2  │ A│ B│ B│ B│ B│ A│
   ├──┼──┼──┼──┼──┼──┤
3  │ B│ B│ C│ C│ B│ B│
   └──┴──┴──┴──┴──┴──┘
```

Cada celda representa una mostacilla.

El canvas visualiza esta estructura.

No debe ser la fuente de verdad.

La fuente de verdad debe ser el modelo de dominio.

---

# 3. Arquitectura general

```text
┌──────────────────────────────────────────┐
│                  Vue UI                  │
├──────────────────────────────────────────┤
│                                          │
│  Editor        Palette       Toolbar     │
│                                          │
├──────────────────────────────────────────┤
│            Application Layer              │
│                                          │
│  PatternService                          │
│  WeavingService                          │
│  HistoryService                          │
│  ImportExportService                     │
│                                          │
├──────────────────────────────────────────┤
│              Domain Layer                 │
│                                          │
│  Pattern                                  │
│  Bead                                     │
│  Palette                                  │
│  WeavingDirection                         │
│  WeavingProgress                          │
│                                          │
├──────────────────────────────────────────┤
│          Persistence Layer                │
│                                          │
│  IndexedDB                                │
│                                          │
├──────────────────────────────────────────┤
│              Browser                     │
│                                          │
│  Service Worker / Cache                  │
│  IndexedDB                               │
└──────────────────────────────────────────┘
```

La aplicación debe poder funcionar completamente sin backend en la primera versión.

---

# 4. Stack tecnológico

## Frontend

* Vue 3
* TypeScript
* Vite
* Composition API
* `<script setup>`
* Pinia
* Vue Router
* Tailwind CSS
* Lucide Icons

## Canvas

El editor no debe depender inicialmente de una librería pesada de dibujo.

La recomendación inicial es:

```text
HTML Canvas 2D
+
motor de grid propio
+
Pointer Events
```

Esto permite controlar completamente:

* zoom,
* pan,
* selección,
* pintura,
* touch,
* mouse,
* stylus,
* rendimiento.

No recomiendo construir cada mostacilla como un componente Vue.

Para un patrón:

```text
100 x 100 = 10.000 celdas
```

crear 10.000 componentes sería innecesariamente pesado.

El canvas debe renderizar las celdas directamente.

---

# 5. Estructura del proyecto

```text
src/
│
├── app/
│   ├── router/
│   ├── providers/
│   └── app.vue
│
├── assets/
│
├── components/
│   ├── common/
│   ├── layout/
│   ├── editor/
│   ├── palette/
│   ├── pattern/
│   └── weaving/
│
├── composables/
│   ├── useCanvas.ts
│   ├── usePointer.ts
│   ├── useZoom.ts
│   ├── useHistory.ts
│   ├── usePattern.ts
│   ├── useWeaving.ts
│   └── useAutosave.ts
│
├── domain/
│   ├── pattern/
│   │   ├── Pattern.ts
│   │   ├── PatternCell.ts
│   │   ├── PatternPalette.ts
│   │   └── PatternRules.ts
│   │
│   └── weaving/
│       ├── WeavingDirection.ts
│       ├── WeavingSequence.ts
│       └── WeavingProgress.ts
│
├── stores/
│   ├── pattern.store.ts
│   ├── editor.store.ts
│   ├── palette.store.ts
│   └── weaving.store.ts
│
├── services/
│   ├── pattern.service.ts
│   ├── weaving.service.ts
│   ├── import.service.ts
│   ├── export.service.ts
│   └── storage.service.ts
│
├── repositories/
│   ├── pattern.repository.ts
│   └── progress.repository.ts
│
├── infrastructure/
│   ├── db/
│   │   ├── database.ts
│   │   ├── patterns.repository.ts
│   │   └── progress.repository.ts
│   │
│   └── pwa/
│       └── service-worker.ts
│
├── utils/
│
├── types/
│
└── main.ts
```

---

# 6. Modelo de datos

## Pattern

```typescript
interface Pattern {
  id: string

  version: number

  name: string

  description?: string

  width: number

  height: number

  cells: PatternCell[]

  palette: PaletteColor[]

  weaving: WeavingConfiguration

  metadata: PatternMetadata

  createdAt: string

  updatedAt: string
}
```

---

# 7. Representación de las celdas

No guardar objetos complejos repetidos para cada celda.

Por ejemplo, NO:

```typescript
{
  row: 0,
  column: 0,
  color: "#FF0000"
}
```

para cada celda.

Es más eficiente utilizar IDs de color.

Ejemplo:

```text
Palette

0 = vacío
1 = rosa
2 = azul
3 = amarillo
4 = verde
```

Entonces:

```text
cells:

[
  1, 1, 2, 2, 1,
  1, 2, 3, 2, 1,
  2, 3, 3, 3, 2
]
```

La posición se calcula mediante:

```typescript
index = row * width + column
```

Por ejemplo:

```typescript
getCell(row, column)
```

calcula:

```typescript
cells[row * width + column]
```

Esto reduce muchísimo el tamaño de almacenamiento.

---

# 8. Paleta

```typescript
interface PaletteColor {
  id: string

  name: string

  hex: string

  sortOrder: number
}
```

Ejemplo:

```json
{
  "id": "pink-01",
  "name": "Rosa pastel",
  "hex": "#F4B8C4",
  "sortOrder": 1
}
```

La paleta debe permitir:

* agregar color,
* eliminar color,
* editar color,
* cambiar nombre,
* seleccionar color,
* duplicar color,
* ordenar colores.

---

# 9. Estado vacío

Se recomienda reservar:

```text
0 = EMPTY
```

Así:

```text
0 0 0 1 1 0
0 1 2 2 1 0
0 1 3 3 1 0
```

permite representar un patrón parcialmente construido.

---

# 10. Tamaño de la manilla

El usuario debe poder modificar:

```text
Ancho
Alto
```

Ejemplo:

```text
Ancho: 15
Alto: 80
```

La UI debe ofrecer:

```text
−  15  +
```

y:

```text
−  80  +
```

Además:

```text
Tamaño personalizado
```

con inputs numéricos.

Debe existir confirmación cuando cambiar dimensiones implique eliminar información.

Ejemplo:

> Reducir el ancho puede eliminar mostacillas existentes. ¿Deseas continuar?

---

# 11. Herramientas del editor

El editor tendrá:

```text
✏️ Pintar
🧽 Borrar
🪣 Rellenar
🖱️ Seleccionar
↩️ Deshacer
↪️ Rehacer
🔍 Zoom
✋ Mover
```

En desktop:

```text
┌─────────────────────────────────────────────┐
│ Logo       Nuevo  Guardar     Tejer         │
├─────────────────────────────────────────────┤
│                                             │
│ Tools │             CANVAS          Palette │
│       │                              🎨      │
│       │                              🟥      │
│       │                              🟦      │
│       │                              🟩      │
│                                             │
└─────────────────────────────────────────────┘
```

En móvil:

```text
┌─────────────────────┐
│ ←  Mi diseño    ⋮   │
├─────────────────────┤
│                     │
│      CANVAS         │
│                     │
│                     │
├─────────────────────┤
│ 🖌  🧽  🪣  ↩  ↪   │
├─────────────────────┤
│      🎨 PALETA      │
└─────────────────────┘
```

La interfaz móvil NO debe intentar ser una copia reducida del desktop.

Debe tener una interfaz propia.

---

# 12. Sistema de interacción

Debe utilizar:

```text
Pointer Events
```

en lugar de implementar por separado:

```text
mousedown
mousemove
mouseup

touchstart
touchmove
touchend
```

Esto permite manejar:

* mouse,
* touch,
* stylus.

Eventos principales:

```text
pointerdown
pointermove
pointerup
pointercancel
```

---

# 13. Pintar

Cuando el usuario toca:

```text
row = ...
column = ...
```

el editor ejecuta:

```typescript
pattern.setCell(
  row,
  column,
  selectedColorId
)
```

El canvas se vuelve a renderizar.

No se debe almacenar el estado exclusivamente en el canvas.

---

# 14. Pintar arrastrando

Si el usuario mantiene presionado y arrastra:

```text
● ● ● ● ●
```

se deben pintar todas las celdas atravesadas.

Hay que evitar:

```text
pointermove
→ guardar IndexedDB
→ renderizar
→ guardar IndexedDB
→ renderizar
```

en cada movimiento.

El flujo correcto:

```text
pointermove
     ↓
actualizar modelo en memoria
     ↓
renderizar
     ↓
fin de interacción
     ↓
persistir
```

---

# 15. Borrador

El borrador simplemente coloca:

```text
EMPTY = 0
```

Ejemplo:

```typescript
pattern.setCell(row, column, EMPTY)
```

---

# 16. Rellenar

La herramienta bucket debe implementar Flood Fill.

Ejemplo:

```text
AAAAAA
AABBAA
AABBAA
AAAAAA
```

Si se selecciona una celda `A`:

```text
CCCCCC
CCBBCC
CCBBCC
CCCCCC
```

Debe funcionar mediante:

```text
BFS
```

o:

```text
DFS iterativo
```

Preferiblemente BFS/DFS iterativo para evitar problemas de stack overflow con patrones grandes.

---

# 17. Deshacer / rehacer

No guardar una copia completa del patrón para cada cambio.

Se recomienda Command Pattern.

Ejemplo:

```typescript
interface EditorCommand {
  execute(): void
  undo(): void
}
```

Una operación:

```text
PaintCellCommand
```

contiene:

```text
row
column
previousColor
newColor
```

Entonces:

```text
Pintar rojo

previous = azul
new = rojo
```

Undo:

```text
rojo → azul
```

Redo:

```text
azul → rojo
```

Para operaciones grandes, como rellenar una región, se almacena el conjunto de cambios afectados.

---

# 18. Autosave

El patrón debe guardarse automáticamente.

No esperar un botón "Guardar".

La interfaz debe mostrar:

```text
✓ Guardado
```

o:

```text
Guardando...
```

o:

```text
Sin conexión · Guardado local
```

Recomendación:

```text
cambio
 ↓
actualización inmediata en memoria
 ↓
debounce 300–800 ms
 ↓
IndexedDB
```

---

# 19. Persistencia

IndexedDB será la base de datos local.

Estructura conceptual:

```text
bead-designer
│
├── patterns
│
├── weaving_progress
│
├── settings
│
└── schema
```

No se recomienda guardar todo en un único objeto gigante.

---

# 20. Tabla patterns

```typescript
PatternRecord {
  id: string
  name: string
  width: number
  height: number
  updatedAt: string
  createdAt: string
  data: Pattern
}
```

Índices:

```text
id
updatedAt
name
```

---

# 21. Tabla weaving_progress

```typescript
WeavingProgress {
  id: string

  patternId: string

  patternVersion: number

  direction: WeavingDirection

  currentStep: number

  totalSteps: number

  completedCells: number[]

  startedAt: string

  updatedAt: string

  completedAt?: string
}
```

---

# 22. IMPORTANTE: diseño y progreso deben ser entidades diferentes

Esto permite:

```text
Diseño
    ↓
Progreso 1
Progreso 2
Progreso 3
```

Por ejemplo:

```text
"Manilla flores rosas"

Diseño original
 ├── Tejido actual: 34%
 ├── Tejido de prueba: 72%
 └── Prototipo: 15%
```

También permite:

```text
Duplicar diseño
```

sin perder los progresos anteriores.

---

# 23. Versionado

El patrón debe tener:

```typescript
version: number
```

Cada modificación estructural importante puede incrementar la versión.

Esto es importante porque un progreso creado para:

```text
Pattern v1
```

puede no ser compatible con:

```text
Pattern v2
```

Si el usuario modifica el patrón mientras existe un tejido en progreso:

```text
El diseño ha cambiado.

El progreso anterior corresponde a una versión anterior.

¿Qué deseas hacer?

[Continuar con copia anterior]
[Reiniciar progreso]
[Crear nuevo progreso]
```

---

# 24. Exportación JSON

La opción principal debe ser JSON.

No Excel.

El JSON conserva perfectamente:

* dimensiones,
* colores,
* patrón,
* orientación,
* configuración,
* metadata.

Ejemplo:

```json
{
  "format": "bead-pattern",
  "version": 1,
  "pattern": {
    "name": "Flores rosas",
    "width": 15,
    "height": 40,
    "palette": [],
    "cells": []
  }
}
```

El archivo puede ser:

```text
flores-rosas.bead.json
```

Aunque físicamente sigue siendo JSON.

---

# 25. Importación

El usuario puede:

```text
Importar diseño
```

y seleccionar:

```text
.bead.json
.json
```

El sistema debe validar:

```text
format
version
width
height
palette
cells
```

Nunca confiar directamente en JSON importado.

Debe existir:

```typescript
validatePatternImport()
```

antes de insertarlo en IndexedDB.

---

# 26. Migración de formatos

El JSON debe tener:

```json
"version": 1
```

En el futuro:

```text
v1 → v2
v2 → v3
```

Esto permite mantener compatibilidad con diseños antiguos.

---

# 27. Excel

Excel puede ser una funcionalidad secundaria.

No lo utilizaría como formato principal.

Excel es bueno para:

```text
visualización
impresión
inventario
```

pero JSON es mucho mejor para:

```text
intercambio
backup
persistencia
versionado
compatibilidad
```

Se podría agregar posteriormente:

```text
Exportar → JSON
Exportar → Excel
Exportar → Imagen
Exportar → PDF
```

---

# 28. Vista de diseños

La pantalla inicial:

```text
Mis diseños

┌─────────────────────────────┐
│ + Crear nueva manilla       │
└─────────────────────────────┘

┌─────────┐ ┌─────────┐
│ preview │ │ preview │
│         │ │         │
│ Flores  │ │ Arcoiris│
│ 15×40   │ │ 20×60   │
└─────────┘ └─────────┘
```

Cada tarjeta:

```text
Preview
Nombre
Dimensiones
Última modificación
Progreso
```

Ejemplo:

```text
Flores rosas

15 × 40

Tejido: 63%

Modificado:
Hace 2 horas
```

Acciones:

```text
Abrir
Duplicar
Renombrar
Exportar
Eliminar
```

---

# 29. Dashboard

La aplicación debe abrir inicialmente en:

```text
Mis diseños
```

No directamente en el editor.

Acciones principales:

```text
+ Nueva manilla

Importar diseño
```

---

# 30. Editor

El editor tendrá cinco áreas conceptuales:

```text
Header
Toolbar
Canvas
Palette
Properties
```

Desktop:

```text
┌───────────────────────────────────────────┐
│ ← Mis diseños   Flores   ✓ Guardado  Tejer│
├──────┬────────────────────────────┬───────┤
│      │                            │       │
│ TOOL │                            │PALETA │
│      │          CANVAS            │       │
│      │                            │       │
│      │                            │       │
├──────┴────────────────────────────┴───────┤
│ Zoom  −   100%   +     15 × 40             │
└───────────────────────────────────────────┘
```

---

# 31. Diseño visual

La aplicación debe sentirse artesanal y moderna.

Paleta general:

```text
Background:
#FFF9F7

Surface:
#FFFFFF

Primary:
#D9A7B0

Secondary:
#B8C9D9

Accent:
#D9C7A7

Text:
#4A4545
```

No utilizar demasiados colores.

Los colores pastel deben estar principalmente en:

* botones,
* selección,
* estados,
* decoración.

El patrón debe respetar los colores reales elegidos por el usuario.

---

# 32. Responsive design

Breakpoints conceptuales:

```text
Mobile
< 640px

Tablet
640px – 1024px

Desktop
> 1024px
```

Pero el diseño no debe depender exclusivamente de breakpoints.

Debe responder también a:

```text
touch
pointer
orientation
viewport
```

---

# 33. Regla principal para móvil

Nunca debe ocurrir:

```text
overflow horizontal accidental
```

ni:

```text
canvas fuera de pantalla
```

El canvas tendrá su propio viewport.

Ejemplo:

```text
┌──────────────────┐
│ Toolbar          │
├──────────────────┤
│                  │
│  ┌────────────┐  │
│  │            │  │
│  │   CANVAS   │  │
│  │            │  │
│  └────────────┘  │
│                  │
├──────────────────┤
│ Tools            │
├──────────────────┤
│ Palette          │
└──────────────────┘
```

---

# 34. Zoom

El canvas debe soportar:

```text
zoom in
zoom out
reset
```

En móvil:

```text
pinch zoom
```

En desktop:

```text
Ctrl + wheel
```

o:

```text
wheel
```

dependiendo del modo.

Rango:

```text
25%
50%
75%
100%
125%
150%
200%
300%
500%
```

Para patrones pequeños:

```text
500%
```

puede ser extremadamente útil.

---

# 35. Pan

Cuando el patrón sea mayor que el viewport:

```text
touch drag
```

permite desplazar el canvas.

En desktop:

```text
space + drag
```

o herramienta:

```text
✋
```

---

# 36. Selección de celda

Al seleccionar una celda:

```text
┌───────┐
│       │
│   ●   │
│       │
└───────┘
```

Debe existir un indicador visual.

Nunca depender exclusivamente del color.

Esto es importante para accesibilidad.

---

# 37. Modo tejido

El botón principal:

```text
🧶 Empezar a tejer
```

abre:

```text
Weaving Mode
```

El usuario primero configura:

```text
Dirección
```

---

# 38. Configuración del tejido

Debe permitir:

```text
Inicio:

○ Arriba
○ Abajo
○ Izquierda
○ Derecha
```

y:

```text
Sentido:

→ Normal
← Invertido
```

Pero para un tejido real esto puede no ser suficiente.

La arquitectura debe permitir agregar posteriormente:

```text
zig-zag
serpentina
diagonal
```

Por eso no se debe codificar:

```typescript
if direction === "left"
```

por todo el proyecto.

Debe existir un algoritmo:

```typescript
generateWeavingSequence(pattern, configuration)
```

---

# 39. WeavingSequence

El sistema transforma:

```text
Pattern
```

en:

```text
WeavingSequence
```

Ejemplo:

```text
Pattern

A B C D
A B C D
A B C D
```

puede producir:

```text
Step 1 → A
Step 2 → B
Step 3 → C
Step 4 → D

Step 5 → D
Step 6 → C
Step 7 → B
Step 8 → A
```

si el patrón se trabaja en serpentina.

---

# 40. Cada paso debe contener

```typescript
interface WeavingStep {
  index: number

  row: number

  column: number

  colorId: string

  colorHex: string
}
```

Opcionalmente:

```typescript
direction
rowNumber
columnNumber
```

---

# 41. Interfaz de tejido

La pantalla debe ser extremadamente simple.

```text
┌──────────────────────────────┐
│ ← Salir          63%         │
├──────────────────────────────┤
│                              │
│       MOSTACILLA #42         │
│                              │
│          ● ROSA              │
│                              │
├──────────────────────────────┤
│                              │
│       Vista del patrón       │
│                              │
│           ┌───┐              │
│           │ ● │ ← actual     │
│           └───┘              │
│                              │
├──────────────────────────────┤
│                              │
│    ← Atrás       Siguiente → │
│                              │
└──────────────────────────────┘
```

---

# 42. Progreso

Mostrar:

```text
42 / 600
```

y:

```text
7%
```

También:

```text
████░░░░░░░░
```

---

# 43. Avance

El usuario puede:

```text
←
→
```

para:

```text
retroceder
avanzar
```

También:

```text
Ir a...
```

para saltar:

```text
Paso 350
```

---

# 44. Completar una mostacilla

El usuario pulsa:

```text
✓
```

El sistema:

```text
currentStep++
```

y guarda:

```text
IndexedDB
```

No debe perderse el progreso si:

* se cierra la pestaña,
* se recarga,
* se apaga el equipo,
* se pierde internet.

---

# 45. Estado del progreso

```typescript
interface WeavingProgress {
  id: string

  patternId: string

  patternVersion: number

  currentStep: number

  totalSteps: number

  direction: WeavingDirection

  updatedAt: string
}
```

El progreso puede ser tan simple como:

```text
currentStep = 127
```

porque la secuencia se puede reconstruir desde el patrón.

No es necesario guardar:

```text
127 objetos completados
```

si el proceso es estrictamente secuencial.

---

# 46. Múltiples progresos

Debe permitirse:

```text
Nuevo progreso
```

Ejemplo:

```text
Flores rosas

Progreso #1
63%

Progreso #2
15%

Progreso #3
0%
```

Esto permite probar diferentes formas de tejido.

---

# 47. Casos de uso

## UC-01 Crear diseño

Actor:

```text
Usuario
```

Flujo:

```text
Mis diseños
 ↓
Nueva manilla
 ↓
Nombre
 ↓
Ancho
 ↓
Alto
 ↓
Crear
 ↓
Editor
```

---

# 48. UC-02 Agregar color

```text
Editor
 ↓
+
 ↓
Selector de color
 ↓
Nombre
 ↓
Guardar
```

---

# 49. UC-03 Pintar mostacilla

```text
Seleccionar color
 ↓
Seleccionar herramienta pintar
 ↓
Presionar celda
 ↓
Actualizar patrón
 ↓
Guardar automáticamente
```

---

# 50. UC-04 Borrar

```text
Seleccionar borrar
 ↓
Seleccionar celda
 ↓
Celda = EMPTY
 ↓
Guardar
```

---

# 51. UC-05 Rellenar

```text
Seleccionar bucket
 ↓
Seleccionar celda
 ↓
Determinar región
 ↓
Cambiar celdas
 ↓
Registrar comando
 ↓
Guardar
```

---

# 52. UC-06 Cambiar tamaño

```text
Propiedades
 ↓
Cambiar ancho/alto
 ↓
Validar
 ↓
Mostrar advertencia
 ↓
Confirmar
 ↓
Crear nuevo grid
 ↓
Conservar celdas compatibles
```

---

# 53. UC-07 Guardar diseño

El usuario no debería tener que pensar en esto.

Debe suceder automáticamente.

---

# 54. UC-08 Exportar

```text
Exportar
 ↓
Validar patrón
 ↓
Serializar
 ↓
Blob
 ↓
Descargar archivo
```

---

# 55. UC-09 Importar

```text
Importar
 ↓
Seleccionar archivo
 ↓
Leer
 ↓
Parsear JSON
 ↓
Validar schema
 ↓
Migrar versión
 ↓
Crear nuevo ID
 ↓
Guardar
 ↓
Abrir editor
```

Nunca sobrescribir automáticamente un diseño existente.

---

# 56. UC-10 Empezar tejido

```text
Abrir diseño
 ↓
Tejer
 ↓
Seleccionar dirección
 ↓
Generar sequence
 ↓
Crear progreso
 ↓
Paso 1
```

---

# 57. UC-11 Continuar tejido

```text
Mis diseños
 ↓
Diseño
 ↓
Continuar tejido
 ↓
Recuperar progreso
 ↓
currentStep
```

---

# 58. UC-12 Crear nuevo progreso

```text
Tejer
 ↓
Menú
 ↓
Nuevo progreso
 ↓
Seleccionar dirección
 ↓
Crear
```

---

# 59. UC-13 Retroceder

```text
currentStep--
```

No modificar el patrón.

El progreso y el patrón son independientes.

---

# 60. UC-14 Cambiar diseño mientras existe progreso

Debe detectarse:

```text
pattern.version !== progress.patternVersion
```

y mostrar advertencia.

---

# 61. Persistencia offline

La aplicación debe ser una PWA.

Arquitectura:

```text
Browser
 │
 ├── Application Cache
 │
 └── IndexedDB
       │
       ├── Patterns
       ├── Progress
       └── Settings
```

El Service Worker permite que los recursos de la aplicación puedan mantenerse disponibles offline, mientras IndexedDB almacena los datos estructurados.

---

# 62. Estado de conexión

Debe existir:

```text
🟢 En línea
```

o:

```text
🟡 Sin conexión
```

Pero perder internet NO debe impedir:

```text
crear
editar
guardar
tejer
exportar
importar
```

---

# 63. Indicador de guardado

Header:

```text
✓ Guardado local
```

Si está guardando:

```text
⟳ Guardando...
```

Si ocurre un error:

```text
⚠ No se pudo guardar
```

La aplicación debe tratar un error de persistencia como un evento importante.

---

# 64. Protección contra pérdida de datos

Al entrar en la aplicación:

```text
navigator.storage.persist()
```

puede solicitar almacenamiento persistente cuando el navegador lo soporte.

Además:

```text
autosave
+
IndexedDB
+
exportación manual
```

forman tres capas de protección.

Importante:

La aplicación nunca debe prometer que los datos locales son imposibles de borrar. El usuario o el navegador pueden borrar el almacenamiento del sitio en determinadas circunstancias. Por eso la exportación JSON debe estar siempre disponible.

---

# 65. Seguridad

Aunque sea una aplicación local, los archivos importados deben tratarse como datos no confiables.

Nunca ejecutar:

```text
eval()
new Function()
HTML recibido
scripts del JSON
```

El importador debe utilizar:

```text
JSON.parse()
+
schema validation
```

---

# 66. Validación del patrón

Reglas:

```text
width >= 1
height >= 1

width <= MAX_WIDTH
height <= MAX_HEIGHT
```

Por ejemplo:

```text
MAX_WIDTH = 500
MAX_HEIGHT = 500
```

El límite debe configurarse.

Esto evita que un archivo malicioso intente crear:

```text
100000 × 100000
```

celdas.

---

# 67. Performance

El canvas debe:

```text
renderizar únicamente cuando cambie el viewport
o el patrón
```

No:

```text
watch profundo de todo el objeto
```

Cada operación debe ser localizada.

Por ejemplo:

```typescript
setCell(row, column, color)
```

y luego:

```text
requestAnimationFrame(render)
```

---

# 68. Renderizado

Conceptualmente:

```typescript
for (let row = 0; row < height; row++) {
  for (let column = 0; column < width; column++) {
    const colorId = cells[row * width + column]

    drawCell(
      row,
      column,
      palette[colorId]
    )
  }
}
```

El tamaño visual de una celda depende del zoom.

```text
cellSize = baseCellSize * zoom
```

---

# 69. Separación fundamental

No mezclar:

```text
Canvas coordinates
```

con:

```text
Pattern coordinates
```

Debe existir:

```text
screenToCanvas()
canvasToPattern()
patternToCanvas()
```

Esto evita errores al utilizar:

```text
zoom
pan
mobile
touch
```

---

# 70. Ejemplo de transformación

```text
Mouse:

x = 437
y = 251

        ↓

Canvas coordinates

x = 350
y = 210

        ↓

Pattern coordinates

column = 12
row = 7
```

El patrón nunca debería saber dónde está físicamente el canvas.

---

# 71. Arquitectura de estado

Pinia:

```text
patternStore
```

responsable de:

```text
pattern actual
```

```text
editorStore
```

responsable de:

```text
tool
zoom
pan
selectedColor
selection
```

```text
weavingStore
```

responsable de:

```text
sequence
progress
```

No meter todo en un único:

```text
useAppStore
```

gigante.

---

# 72. Pattern Store

Ejemplo conceptual:

```typescript
const patternStore = defineStore('pattern', () => {

  const pattern = ref<Pattern | null>(null)

  function setCell(
    row: number,
    column: number,
    colorId: number
  ) {
    // dominio
  }

  function resize(
    width: number,
    height: number
  ) {
    // dominio
  }

  return {
    pattern,
    setCell,
    resize
  }
})
```

---

# 73. Domain Rules

Las reglas importantes no deben vivir en Vue.

Incorrecto:

```vue
<button @click="
  if (...) {
     ...
  }
">
```

Correcto:

```text
Vue
 ↓
Store
 ↓
Service
 ↓
Domain
```

Por ejemplo:

```typescript
resizePattern(pattern, width, height)
```

debe funcionar incluso si mañana se reemplaza Vue.

---

# 74. Testing

Debe existir testing desde el inicio.

## Unit tests

Probar:

```text
Pattern
resize
setCell
getCell
fill
validation
weaving sequence
progress
import
export
```

Especialmente:

```text
flood fill
```

y:

```text
weaving sequence
```

porque son lógica de negocio.

---

# 75. Tests críticos

Caso:

```text
Pattern 3x3

A A A
A B A
A A A
```

Bucket sobre A:

Resultado:

```text
C C C
C B C
C C C
```

Otro:

```text
A A
B B
C C
```

Dirección:

```text
top → bottom
```

Debe producir:

```text
A
A
B
B
C
C
```

Si serpentina:

```text
A
A
B
B
C
C
```

pero las columnas/fila correspondientes deben invertirse cuando cambie el sentido.

Estos algoritmos deben probarse independientemente del canvas.

---

# 76. E2E

Playwright:

```text
Crear diseño
 ↓
Pintar
 ↓
Recargar
 ↓
Verificar patrón
```

Otro:

```text
Crear
 ↓
Tejer
 ↓
Avanzar 20
 ↓
Recargar
 ↓
Continuar en 21
```

Otro:

```text
Exportar
 ↓
Importar
 ↓
Comparar
```

---

# 77. Accesibilidad

Aunque sea una herramienta visual, debe tener:

```text
aria-label
focus states
keyboard shortcuts
contraste
```

Herramientas:

```text
P = Paint
E = Eraser
F = Fill
H = Hand
Ctrl+Z
Ctrl+Shift+Z
```

En móvil no depender de teclado.

---

# 78. Accesibilidad de color

No asumir que:

```text
rojo ≠ verde
```

es suficiente.

La celda seleccionada debe tener:

```text
borde
indicador
```

además del color.

---

# 79. Atajos

Desktop:

```text
P → pintar
E → borrar
F → rellenar
H → mover

Ctrl+Z → undo
Ctrl+Shift+Z → redo

+ → zoom in
- → zoom out

Space + drag → pan
```

---

# 80. Diseño del flujo completo

```text
                 ┌──────────────┐
                 │ Mis diseños  │
                 └──────┬───────┘
                        │
              ┌─────────┴─────────┐
              │                   │
          Nuevo diseño        Abrir diseño
              │                   │
              └─────────┬─────────┘
                        ↓
                 ┌──────────────┐
                 │    Editor    │
                 └──────┬───────┘
                        │
        ┌───────────────┼──────────────┐
        │               │              │
      Pintar         Configurar     Exportar
        │               │
        │               ↓
        │           Guardado
        │
        ↓
    Patrón listo
        │
        ↓
     Tejer
        │
        ↓
 Configurar dirección
        │
        ↓
 Generar secuencia
        │
        ↓
 ┌──────────────────┐
 │ Modo tejido      │
 │                  │
 │ Paso 127 / 600   │
 │                  │
 │ ←       →        │
 └──────────────────┘
        │
        ↓
   Autosave
        │
        ↓
   Continuar luego
```

# 81. MVP

La primera versión no debe intentar implementar absolutamente todo.

El MVP debería contener:

### Fase 1

```text
Vue
TypeScript
Vite
Tailwind
Pinia

IndexedDB

Lista de diseños

Crear diseño

Canvas

Grid

Paleta

Pintar

Borrar

Zoom

Pan

Undo

Redo

Autosave
```

### Fase 2

```text
Rellenar

Resize

Import JSON

Export JSON

PWA

Offline
```

### Fase 3

```text
Modo tejido

Dirección

Secuencia

Progreso

Continuar

Retroceder

Nuevo progreso
```

### Fase 4

```text
Excel

PDF

Imagen

estadísticas

mejoras de accesibilidad

atajos

plantillas
```

---

# 82. Funcionalidades futuras

La arquitectura debe dejar espacio para:

```text
Plantillas
```

```text
Duplicar patrones
```

```text
Compartir patrones
```

```text
Cuenta de usuario
```

```text
Sincronización cloud
```

```text
Backup
```

```text
Biblioteca de colores
```

```text
Catálogo de referencias de mostacillas
```

```text
Conteo de mostacillas
```

Por ejemplo:

```text
Rosa pastel: 132
Azul: 87
Blanco: 54
Verde: 41
```

Esto podría convertirse posteriormente en una funcionalidad muy valiosa para quien realmente fabrica las manillas.

---

# 83. Posible evolución futura

Si posteriormente se necesita sincronización:

```text
                    ┌──────────────┐
                    │   Backend    │
                    │              │
                    │ PostgreSQL   │
                    └──────▲───────┘
                           │
                        Sync API
                           │
┌──────────────┐           │
│ IndexedDB    │◄──────────┤
│              │           │
│ Offline      │───────────┘
└──────────────┘
```

Pero el backend NO debe ser necesario para el MVP.

---

# 84. Decisión arquitectónica importante

El sistema debe ser:

```text
Local-first
Offline-first
Domain-first
Canvas-based
```

y no:

```text
Canvas-first
```

Es decir:

```text
Pattern
   ↓
Domain
   ↓
Application
   ↓
Canvas
```

no:

```text
Canvas
   ↓
intentamos descubrir qué patrón tiene
```

---

# 85. Regla de oro del proyecto

El usuario debe sentir que está:

> "dibujando una manilla"

y no:

> "usando un editor gráfico complicado".

Por eso las operaciones más frecuentes deben estar a un toque:

```text
Color
Pintar
Borrar
Deshacer
```

y el resto debe permanecer secundario.

---

# 86. Resultado esperado

La experiencia final debería ser:

```text
ABRIR APP
    ↓
+ NUEVA MANILLA
    ↓
15 × 40
    ↓
SELECCIONAR COLOR
    ↓
PINTAR
    ↓
PATRÓN TERMINADO
    ↓
TEJER
    ↓
"Coloca una mostacilla ROSA"
    ↓
✓
    ↓
"Coloca una mostacilla BLANCA"
    ↓
✓
    ↓
...
    ↓
100%
    ↓
MANILLA TERMINADA
```

El usuario nunca debería preocuparse por:

```text
guardar
conectarse
configurar una base de datos
perder el progreso
```

Todo eso debe manejarlo la aplicación.