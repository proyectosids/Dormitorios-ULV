import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

router.post('/registrar', async (req, res) => {
  const { matriculaEstudiante, clavePreceptor, idNivel, motivo } = req.body;
  console.log(`[API Amonestaciones] POST /registrar - Estudiante: ${matriculaEstudiante}, Preceptor: ${clavePreceptor}, Nivel: ${idNivel}`);

  if (!matriculaEstudiante || !clavePreceptor || !idNivel || !motivo) {
     return res.status(400).json({ success: false, message: 'Faltan datos requeridos (matriculaEstudiante, clavePreceptor, idNivel, motivo).' });
  }

  try {
    const pool = await getConnection();
    await pool.request()
      .input('MatriculaEstudiante', sql.VarChar(10), matriculaEstudiante)
      .input('ClavePreceptor', sql.VarChar(10), clavePreceptor)
      .input('IdNivel', sql.Int, idNivel)
      .input('Motivo', sql.VarChar(200), motivo)
      .input('Fecha', sql.Date, new Date()) // Fecha actual del servidor
      .query(`
        INSERT INTO Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Motivo, Fecha)
        VALUES (@MatriculaEstudiante, @ClavePreceptor, @IdNivel, @Motivo, @Fecha)
      `);

    console.log(`[API Amonestaciones] POST /registrar - Amonestación registrada con éxito.`);
    res.json({ success: true, message: '✅ Amonestación registrada correctamente' }); 

  } catch (error) {
    console.error('[API Amonestaciones] Error en POST /registrar:', error);
     if (error.originalError && error.originalError.info.number === 547) {
        if (error.message.includes('FK__Amonestac__Matri')) {
           return res.status(400).json({ success: false, message: 'Error: La matrícula del estudiante no existe.', error: error.message });
        }
        if (error.message.includes('FK__Amonestac__Clave')) {
            return res.status(400).json({ success: false, message: 'Error: La clave del preceptor no existe.', error: error.message });
        }
         if (error.message.includes('FK__Amonestac__IdNiv')) {
            return res.status(400).json({ success: false, message: 'Error: El nivel de amonestación seleccionado no existe.', error: error.message });
        }
    }
    res.status(500).json({ success: false, message: '❌ Error en el servidor al registrar la amonestación', error: error.message });
  }
});

router.get('/', async (req, res) => {
   console.log('[API Amonestaciones] GET / (Todas)');
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
        A.Fecha
      FROM Amonestaciones A
      INNER JOIN Estudiantes E ON A.MatriculaEstudiante = E.Matricula
      INNER JOIN Preceptores P ON A.ClavePreceptor = P.ClaveEmpleado
      INNER JOIN Cat_NivelAmonestacion N ON A.IdNivel = N.IdNivel
      ORDER BY A.Fecha DESC -- Ordenamos por fecha descendente
    `);
    console.log(`[API Amonestaciones] GET / (Todas) - Encontradas: ${result.recordset.length}`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
     console.error('[API Amonestaciones] Error en GET / (Todas):', error);
    res.status(500).json({ success: false, message: '❌ Error al obtener todas las amonestaciones', error: error.message });
  }
});

router.get('/estudiante/:matricula', async (req, res) => {
  const { matricula } = req.params;
   console.log(`[API Amonestaciones] GET /estudiante/${matricula}`);

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
          N.Nombre AS Nivel
        FROM Amonestaciones A
        INNER JOIN Preceptores P ON A.ClavePreceptor = P.ClaveEmpleado
        INNER JOIN Cat_NivelAmonestacion N ON A.IdNivel = N.IdNivel
        WHERE A.MatriculaEstudiante = @Matricula
        ORDER BY A.Fecha DESC 
      `);
    console.log(`[API Amonestaciones] GET /estudiante/${matricula} - Encontradas: ${result.recordset.length}`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
     console.error(`[API Amonestaciones] Error en GET /estudiante/${matricula}:`, error);
    res.status(500).json({ success: false, message: '❌ Error al buscar amonestaciones del estudiante', error: error.message });
  }
});

router.get('/niveles', async (req, res) => {
  console.log('[API Amonestaciones] GET /niveles');
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT IdNivel, Nombre 
      FROM Cat_NivelAmonestacion 
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

