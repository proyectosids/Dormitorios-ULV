import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';
import { enviarNotificacion } from '../services/notification.service.js';

const router = Router();

router.post('/registrar', async (req, res) => {
  const { matriculaEstudiante, clavePreceptor, idNivel, motivo } = req.body;

  if (!matriculaEstudiante || !clavePreceptor || !idNivel || !motivo) {
     return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
  }

  try {
    const pool = await getConnection();
    await pool.request()
      .input('MatriculaEstudiante', sql.VarChar(10), matriculaEstudiante)
      .input('ClavePreceptor', sql.VarChar(10), clavePreceptor)
      .input('IdNivel', sql.Int, idNivel)
      .input('Motivo', sql.VarChar(200), motivo)
      .input('Fecha', sql.Date, new Date())
      .query(`
        INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Motivo, Fecha)
        VALUES (@MatriculaEstudiante, @ClavePreceptor, @IdNivel, @Motivo, @Fecha)
      `);

    // --- NOTIFICACIÓN ---
    enviarNotificacion(
      matriculaEstudiante,
      "⚠️ Nueva Amonestación",
      `Se ha registrado una amonestación: ${motivo}. Favor de pasar a firmar.`
    );

    res.json({ success: true, message: '✅ Amonestación registrada correctamente' }); 
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        A.IdAmonestacion, 
        A.MatriculaEstudiante, 
        E.NombreCompleto AS Estudiante, 
        P.NombreCompleto AS Preceptor, 
        N.Nombre AS Nivel,
        A.Motivo, 
        A.Fecha,
        A.FirmaEstudiante, -- Coma corregida aquí
        A.FechaFirma
      FROM dormi.Amonestaciones A
      INNER JOIN dormi.Estudiantes E ON A.MatriculaEstudiante = E.Matricula
      INNER JOIN dormi.Preceptores P ON A.ClavePreceptor = P.ClaveEmpleado
      INNER JOIN dormi.Cat_NivelAmonestacion N ON A.IdNivel = N.IdNivel
      ORDER BY A.Fecha DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

router.get('/estudiante/:matricula', async (req, res) => {
  const { matricula } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('Matricula', sql.VarChar(10), matricula)
      .query(`
        SELECT 
          A.IdAmonestacion, 
          A.Motivo, 
          A.Fecha, 
          P.NombreCompleto AS Preceptor, 
          N.Nombre AS Nivel,
          A.FirmaEstudiante, -- Coma corregida aquí
          A.FechaFirma
        FROM dormi.Amonestaciones A
        INNER JOIN dormi.Preceptores P ON A.ClavePreceptor = P.ClaveEmpleado
        INNER JOIN dormi.Cat_NivelAmonestacion N ON A.IdNivel = N.IdNivel
        WHERE A.MatriculaEstudiante = @Matricula
        ORDER BY A.Fecha DESC 
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

router.get('/niveles', async (req, res) => {
  console.log('[API Amonestaciones] GET /niveles');
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT IdNivel, Nombre 
      FROM dormi.Cat_NivelAmonestacion 
      ORDER BY IdNivel ASC 
    `);
    console.log(`[API Amonestaciones] GET /niveles - Encontrados: ${result.recordset.length}`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('[API Amonestaciones] Error en GET /niveles:', error);
    res.status(500).json({ success: false, message: 'Error al obtener niveles de amonestación', error: error.message });
  }
});

export default router;