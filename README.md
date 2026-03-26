# Módulo de Limpieza

## Problemas Identificados en el Código Original
1. **Acoplamiento Fuerte**: La lógica de negocio (cálculo de totales), la infraestructura (SQL Server, Cloudinary) y el framework (Express) estaban mezclados en un solo archivo de rutas.
2. **Dificultad de Mantenimiento**: Cualquier cambio en la base de datos obligaba a modificar directamente el controlador HTTP.
3. **Falta de Entidades**: No existía una representación clara del objeto "Limpieza" fuera de la tabla de la base de datos.

## Mejoras Aplicadas (Arquitectura Limpia)
- **Capa de Dominio**: Se creó la entidad `Limpieza.js` que contiene las reglas de negocio, como el cálculo automático del puntaje total, de forma aislada.
- **Capa de Aplicación**: Se implementó el caso de uso `RegistrarLimpieza.js` para orquestar el flujo entre la subida de imágenes, la persistencia y el envío de notificaciones push.
- **Capa de Infraestructura**: 
  - Se separó la configuración de Express en un archivo independiente (`express.js`).
  - Se creó el repositorio `LimpiezaRepositorySql.js` para abstraer todas las consultas a MSSQL, desacoplando la lógica del motor de base de datos.

## Integración con Flutter
- Se validó que la App móvil sigue enviando los datos correctamente al endpoint `/api/limpieza/registrar`, confirmando que la refactorización interna no rompió la comunicación externa.

# Módulo Auth
## Problema Identificado: 
El manejo de contraseñas (bcrypt) y las llamadas externas a la API de la ULV (axios) estaban mezcladas con la lógica de las rutas, rompiendo el principio de responsabilidad única.

### Mejora Aplicada:
Se implementó el patrón Repository para centralizar el acceso a la tabla dormi.Usuarios y se crearon Casos de Uso para manejar de forma independiente la validación de acceso externo y el cifrado de datos.

### Dificultades:
Coordinar transacciones SQL complejas que afectan a múltiples tablas (Usuarios y Estudiantes) al momento del registro, lo cual se resolvió encapsulando la transacción dentro del repositorio.

# Módulo de Estudiantes
## 1. Problemas Identificados en el Código Original
Mezcla de Orígenes de Datos: Las rutas consultaban tanto la base de datos local (dormi.Estudiantes) como una base de datos externa (SIAE para las fotos) de forma directa.

### Tratamiento de Datos Binarios:
El envío de buffers de imágenes directamente desde el controlador HTTP dificultaba la creación de pruebas unitarias y el desacoplamiento.

### Falta de Abstracción: 
No existía una representación clara del "Estudiante" como entidad de negocio, solo como resultado de una consulta SQL.

## 2. Mejoras Aplicadas (Arquitectura Limpia)
### Capa de Dominio: 
Se implementó la entidad Estudiante.js, estableciendo una estructura de datos estándar que es independiente de cómo se almacene en SQL Server.

### Capa de Aplicación: 
Se crearon Casos de Uso específicos como ObtenerFotoEstudiante.js y ActualizarAsignacionCuarto.js. Esto separa la "acción" de la "tecnología".

### Capa de Infraestructura (Patrón Repository):

Se creó EstudianteRepositorySql.js para centralizar el acceso a datos.

### Desacoplamiento Externo: 
La lógica para obtener la foto desde la tabla externa [IDS-APP].[dbo].[controlEscolar_DocumentosAlumno] quedó encapsulada. Si el sistema externo cambia, solo se modifica el repositorio.

### Capa de Interfaces (HTTP):
Las rutas en estudiantes.js ahora son minimalistas; solo reciben parámetros de la URL y delegan la responsabilidad al repositorio o al caso de uso correspondiente.

## 3. Integración con Flutter
Se verificó que el endpoint de la foto (/api/estudiantes/:matricula/foto) sigue devolviendo el Content-Type: image/jpeg, asegurando que el widget de perfil en Flutter cargue la imagen sin errores.

La funcionalidad de asignación de cuartos fue probada desde la App, confirmando que los cambios de estado en SQL Server se realizan correctamente bajo el nuevo flujo de capas.


# Módulo de Dormitorios
## 1. Problemas Identificados en el Código Original
Lógica de Relaciones Expuesta: Las consultas que unían Pasillos, Cuartos y Estudiantes estaban escritas directamente en el archivo de rutas, exponiendo la complejidad de la base de datos a la capa de transporte (HTTP).

Dificultad de Agrupación: Al no existir una capa de aplicación, cualquier lógica para agrupar estudiantes por pasillo o edificio tenía que hacerse en Flutter o mezclarse con el código de Express.

Inexistencia de Modelos de Dominio: No se contaba con clases que representaran la infraestructura física (Edificios, Pasillos), lo que limitaba la validación de reglas de negocio (como no exceder la capacidad de un cuarto).

## 2. Mejoras Aplicadas (Arquitectura Limpia)
Capa de Dominio: Se crearon las entidades Dormitorio, Pasillo y Cuarto. Esto permite que el sistema entienda la jerarquía física del Hogar Universitario independientemente de la base de datos.

Capa de Aplicación: Se implementó el caso de uso ObtenerMapaOcupacion.js, el cual se encarga de orquestar la información necesaria para que la administración visualice el estado de los edificios en tiempo real.

Capa de Infraestructura (Patrón Repository):

Se centralizaron las consultas en DormitorioRepositorySql.js.

Mantenibilidad: La consulta de ocupación (que usa múltiples LEFT JOINs) quedó encapsulada. Si la estructura de las tablas de dormitorios cambia, el resto de la API no se ve afectada.

## 3. Integración con Flutter
Se garantizó que los endpoints mantuvieran el mismo contrato de datos para que las listas desplegables (Dropdowns) de selección de pasillo y cuarto en la App de Flutter sigan funcionando sin ajustes en el frontend.

El "Mapa de Ocupación" fue validado para asegurar que los nombres de los estudiantes aparezcan correctamente vinculados a sus números de cuarto correspondientes.


# Módulo de Cultos

### 1. Problemas Identificados en el Código Original
- **Lógica de Catálogo Expuesta**: La consulta directa a la tabla `dormi.Cat_TipoCulto` dentro del controlador HTTP mezclaba la definición del esquema de base de datos con la respuesta del API.
- **Falta de Escalabilidad**: Al no tener una capa de repositorio, agregar lógica para filtrar cultos por fecha o semestre resultaría en código desordenado dentro de las rutas.

### 2. Mejoras Aplicadas (Arquitectura Limpia)
- **Capa de Dominio**: Se creó la entidad `TipoCulto.js` para estandarizar la representación de los eventos religiosos dentro de la lógica del sistema.
- **Capa de Infraestructura (Patrón Repository)**: Se implementó `CultoRepositorySql.js`, centralizando el acceso al catálogo. Esto permite que, si el catálogo migra a una base de datos externa o un servicio de microservicios, el cambio sea transparente para el resto de la aplicación.
- **Simplicidad en Rutas**: El archivo `cultos.js` en infraestructura ahora solo actúa como un puente, cumpliendo con el principio de responsabilidad única.

### 3. Integración con Flutter
- Se mantuvo el contrato de respuesta JSON (`success`, `data`) para asegurar que los selectores de tipo de culto en la aplicación móvil Flutter sigan cargando la lista de opciones correctamente desde el servidor.

# Módulo de Reportes
## 1. Problemas Identificados en el Código Original
Lógica de Negocio Dispersa: La regla de "acumulación de 3 reportes para generar una amonestación" estaba escrita dentro del controlador de Express. Esto dificultaba su mantenimiento y pruebas unitarias.

Falta de Atomicidad: Si el sistema creaba el reporte pero fallaba al crear la amonestación automática, los datos quedaban inconsistentes.

Consultas SQL Gigantes: El uso de subconsultas (getReportanteNombreQuery) y LEFT JOINs complejos dentro de la ruta hacía que el código fuera difícil de leer y propenso a errores de sintaxis.

## 2. Mejoras Aplicadas (Arquitectura Limpia)
Capa de Dominio: Se implementó la entidad Reporte.js, la cual se encarga de definir el estado inicial del reporte basándose únicamente en el tipo de usuario que lo crea (Regla de Negocio Pura).

Capa de Aplicación (Casos de Uso):

Se creó CrearReporte.js para orquestar el flujo completo: guardar el reporte, verificar acumulaciones y disparar notificaciones push.

Capa de Infraestructura (Transaccionalidad):

Se implementó una Transacción SQL en ReporteRepositorySql.js. Esto garantiza que el reporte y la amonestación se guarden juntos o no se guarde nada, protegiendo la integridad de la base de datos.

Paginación Abstraída: La lógica de OFFSET y FETCH NEXT se movió al repositorio, permitiendo que la API maneje grandes volúmenes de datos de forma eficiente.

## 3. Integración con Flutter
Se mantuvo la estructura de la respuesta paginada (total, page, limit) para que el scroll infinito y los buscadores en la App de Flutter sigan funcionando sin cambios en el frontend.

Se validó que las notificaciones push lleguen al dispositivo del estudiante inmediatamente después de que un preceptor apruebe un reporte pendiente.

# Módulo de Amonestaciones

## 1. Problemas Identificados en el Código Original
- **Duplicidad de Consultas**: La lógica para obtener niveles de amonestación y el listado general estaba acoplada a las rutas, dificultando la reutilización del catálogo en otros módulos.
- **Falta de Abstracción de Notificaciones**: El envío de alertas push estaba "quemado" dentro del controlador, lo que impedía registrar una amonestación sin disparar obligatoriamente una notificación (importante para procesos automáticos).

## 2. Mejoras Aplicadas (Arquitectura Limpia)
- **Capa de Dominio**: Se estandarizó la entidad `Amonestacion.js` para asegurar que todas las sanciones tengan una fecha de registro consistente generada por el sistema.
- **Capa de Aplicación**: El Caso de Uso `RegistrarAmonestacion.js` ahora centraliza la responsabilidad de persistir la sanción y comunicar al estudiante de forma asíncrona.
- **Capa de Infraestructura**:
    - Se centralizaron los `JOINs` complejos en `AmonestacionRepositorySql.js`, permitiendo obtener nombres de preceptores y niveles de catálogo de forma eficiente y en un solo lugar.
    - Se optimizó el endpoint de `/niveles` para servir como un microservicio de catálogo reutilizable por toda la infraestructura.

## 3. Integración con Flutter
- Se validó que la App de Flutter reciba correctamente la lista de niveles para llenar los `DropdownButton` en el formulario de registro de disciplina.
- Se confirmó que el historial de amonestaciones por estudiante se cargue con los nombres de los preceptores involucrados, mejorando la transparencia del proceso disciplinario en el móvil.


# Módulo de Asistencia (Cultos)
## 1. Problemas Identificados en el Código Original
Procesamiento Masivo Ineficiente: La lógica para reportar faltantes iteraba sobre una lista de matrículas realizando múltiples consultas SQL individuales por cada estudiante, lo que sobrecargaba el pool de conexiones.

Lógica de Negocio Oculta: Las reglas que definen el límite de faltas (2 para cultos vespertinos, 3 para otros) estaban mezcladas con el código del servidor Express, lo que hacía que el sistema fuera difícil de ajustar si las reglas de la institución cambiaban.

Riesgo de Inconsistencia: El envío de notificaciones push y el registro de amonestaciones automáticas no estaban protegidos por una transacción robusta, permitiendo que un error en la red dejara registros a medias.

## 2. Mejoras Aplicadas (Arquitectura Limpia)
Capa de Dominio: Se creó la entidad Asistencia.js para estandarizar el registro de asistencia, independientemente de si se captura por ID o por nombre del culto.

Capa de Aplicación (Casos de Uso):

Se implementó ReportarInasistenciaMasiva.js, un orquestador que coordina la persistencia en lote y el envío de notificaciones push personalizadas para cada estudiante reportado.

Capa de Infraestructura (Optimización SQL):

Transaccionalidad Atómica: Se encapsuló todo el proceso de reporte y amonestación automática en una sola Transacción SQL. Si un solo paso falla, se revierte todo para evitar "falsos reportes".

Abstracción de Reglas: El repositorio ahora calcula dinámicamente el límite de faltas basándose en el tipo de culto, permitiendo que la capa de aplicación sea más limpia y fácil de leer.

## 3. Integración con Flutter
Se validó que el flujo de "Lista de Faltantes" (operación de conjuntos en SQL) sea eficiente para que la App de Flutter cargue instantáneamente la lista de estudiantes que no han pasado asistencia.

Se confirmó que la respuesta del servidor tras un reporte masivo devuelva un resumen claro, permitiendo que el Monitor/Preceptor vea una confirmación visual del éxito de la operación en su dispositivo móvil.


# Módulo de Usuarios

## 1. Problemas Identificados en el Código Original
- **Lógica Transaccional en Rutas**: El proceso de limpiar los datos de pasillo de un estudiante al quitarle el rol de monitor estaba mezclado con el código de Express, lo que ponía en riesgo la integridad si una de las dos consultas fallaba.
- **Validaciones de Negocio Débiles**: Las comprobaciones de si un rol era válido o si el usuario ya tenía ese rol estaban dispersas, dificultando su reutilización en otros procesos administrativos.

## 2. Mejoras Aplicadas (Arquitectura Limpia)
- **Capa de Dominio**: Se centralizó la validación de roles permitidos en la entidad `UsuarioAdmin.js`, asegurando que solo los roles 2 (Monitor) y 3 (Estudiante) puedan ser gestionados a través de este flujo.
- **Capa de Aplicación**: El Caso de Uso `CambiarRolUsuario.js` actúa como el único responsable de validar el estado previo del usuario antes de permitir una actualización.
- **Capa de Infraestructura**:
    - Se implementó una **Transacción SQL** en el repositorio para asegurar que el cambio de rol en la tabla `Usuarios` y la limpieza de privilegios en la tabla `Estudiantes` ocurran de forma atómica (Todo o nada).
    - Se aisló la lógica de persistencia, permitiendo que las rutas sean agnósticas a cómo se estructuran las tablas en SQL Server.

## 3. Integración con Flutter
- Se mantuvo la compatibilidad con los ID de usuario enviados desde la App móvil, garantizando que los cambios de privilegios se reflejen inmediatamente en la interfaz del usuario tras un cierre e inicio de sesión.


# Módulo de Configuración

## 1. Problemas Identificados en el Código Original
- **Operaciones Críticas Expuestas**: Una acción de alto impacto (borrar asignaciones de cuartos de todos los estudiantes) vivía directamente en el archivo de rutas, sin una capa de protección intermedia.
- **Lógica de Negocio en el Controlador**: La decisión de qué campos de la tabla `Estudiantes` limpiar al finalizar un semestre estaba acoplada al framework Express.

## 2. Mejoras Aplicadas (Arquitectura Limpia)
- **Capa de Aplicación (Seguridad)**: Se implementó el Caso de Uso `CerrarSemestreActual.js`, el cual valida que los datos de entrada sean correctos antes de siquiera intentar tocar la base de datos.
- **Capa de Infraestructura (Integridad)**: Se utilizó una **Transacción SQL** en `ConfiguracionRepositorySql.js` para asegurar que el cierre del semestre anterior, la apertura del nuevo y el vaciado de cuartos ocurran como una única unidad de trabajo. Esto evita que el sistema quede en un estado inconsistente (ej. semestre cerrado pero estudiantes aún con cuarto asignado).

## 3. Integración con Flutter
- Se garantizó que la respuesta JSON informe a la App del preceptor sobre el éxito de la operación masiva, permitiendo que el frontend de Flutter refresque las vistas de ocupación inmediatamente.


# Módulo de Firmas Digitales

## 1. Problemas Identificados en el Código Original
- **Lógica Condicional en Rutas**: El uso de `if/else` para decidir qué tabla actualizar (`Reportes` vs `Amonestaciones`) ensuciaba el controlador HTTP y dificultaba la extensión a nuevos documentos firmables.
- **Manejo de Grandes Volúmenes de Datos**: La recepción de firmas en Base64 (Strings de gran tamaño) se procesaba sin una validación previa de la entidad, lo que podía causar errores de memoria si el formato no era el adecuado.

## 2. Mejoras Aplicadas (Arquitectura Limpia)
- **Capa de Dominio**: Se implementó la entidad `Firma.js` con un método estático de validación de tipos, centralizando los documentos que legalmente requieren firma en el Hogar Universitario.
- **Capa de Infraestructura (Estrategia de Persistencia)**:
    - Se abstrajo la lógica de actualización en `FirmaRepositorySql.js`. El repositorio ahora es capaz de resolver dinámicamente el destino de la firma sin que la capa de aplicación o de transporte tengan que conocer los nombres de las tablas de SQL Server.
    - **Optimización de Tipos**: Se configuró explícitamente el uso de `sql.VarChar(sql.MAX)` para garantizar que las firmas de alta resolución enviadas desde Flutter no se trunquen al ser guardadas.

## 3. Integración con Flutter
- Se garantizó que el endpoint `/api/firmas/guardar` reciba las firmas generadas por el widget de "Signature Pad" en Flutter, asegurando que la reconstrucción del documento firmado sea íntegra y esté vinculada correctamente al historial del estudiante.
