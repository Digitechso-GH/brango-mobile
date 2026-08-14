# ⚙️ Reglas de Agente para Mobile (Bran Go Mobile)

> **REGLA OBLIGATORIA DE RAÍZ**: Antes de cualquier cambio, consulta el archivo principal [`AGENTS.md`](file:///c:/Users/Juan/Desktop/Front/BranGo/AGENTS.md) en la raíz del proyecto y el documento de arquitectura mobile [`docs/06-mobile-rules.md`](file:///c:/Users/Juan/Desktop/Front/BranGo/docs/06-mobile-rules.md).

## Reglas Estrictas para Mobile:
1. **Estructura por Feature**: Todo el código de mobile se organiza exclusivamente en `src/features/<dominio>/` (`auth/`, `orders/`, `tracking/`) y `src/shared/`. Prohibido crear archivos en estructuras planas antiguas.
2. **Idioma del Código**: Todo el código (variables, funciones, tipos, interfaces, esquemas, props, estado) DEBE estar escrito en **Inglés**.
   - Queda prohibido el uso de términos en español como `chofer`, `usuarioId`, `latitud`, `longitud`, `origenLat`.
3. **CERO PARCHES**: Toda respuesta de API se debe transformar y normalizar en la capa de API (`*.api.ts`) y validarse con Zod. Prohibido trucos temporales en pantallas.
4. **GPS & Background Location**:
   - Para que el tracking GPS funcione en background / con pantalla apagada, se DEBE usar `Location.startLocationUpdatesAsync` con `expo-task-manager` (`BACKGROUND_LOCATION_TASK`).
   - Requiere permisos de background location (`Always`).
   - **Desarrollo:** Las tareas de background no funcionan en Expo Go. Se debe correr obligatoriamente sobre un **development build** de EAS.
   - **Prueba:** Se debe probar obligatoriamente en un dispositivo físico real, no en emulador.
5. **Rutas e Inicio de Recorrido**:
   - El icono del chofer 🚚 y la línea de ruta se muestran en el mapa **únicamente si el recorrido ha iniciado** (`IN_TRANSIT`).
   - Al seleccionar un pedido pendiente, sólo se muestra el hito de destino (fósforo).
6. **Cola de Pedidos**:
   - La hoja de ruta se ordena mediante `sequenceIndex`. Si el chofer reordena las paradas, se debe sincronizar inmediatamente con `PATCH /orders/reorder`.

