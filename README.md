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


Caso de Uso: src/application/usecases/ObtenerFotoEstudiante.js (Orquestador).

Repositorio: src/infrastructure/repositories/EstudianteRepositorySql.js (SQL puro).

Ruta Refactorizada: src/infrastructure/http/routes/estudiantes.js (Llamada limpia).
