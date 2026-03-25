# Análisis de Refactorización: Módulo de Limpieza

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
