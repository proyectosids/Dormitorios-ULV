import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// 0. Obtener lista de DORMITORIOS (Edificios)
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Dormitorios');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener dormitorios', error });
  }
});

// 1. Obtener todos los PASILLOS
router.get('/pasillos', async (req, res) => {
  try {
    const pool = await getConnection();
    // Ajusta la consulta si quieres filtrar por dormitorio específico
    const result = await pool.request().query('SELECT * FROM Pasillos');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pasillos', error });
  }
});

// 2. Obtener CUARTOS de un pasillo específico
router.get('/cuartos', async (req, res) => {
  const { idPasillo } = req.query; // Recibimos ?idPasillo=1

  if (!idPasillo) {
    return res.status(400).json({ success: false, message: 'Falta el idPasillo' });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('IdPasillo', sql.Int, idPasillo)
      .query(`
        SELECT * FROM Cuartos 
        WHERE IdPasillo = @IdPasillo
        -- Opcional: Mostrar solo cuartos con espacio disponible
        -- AND (Capacidad - (SELECT COUNT(*) FROM Estudiantes WHERE IdCuarto = Cuartos.IdCuarto)) > 0
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cuartos', error });
  }
});

// 3. Obtener el MAPA DE OCUPACIÓN (Quién está en qué cuarto)
router.get('/ocupacion', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        P.NombrePasillo,
        C.IdCuarto,
        C.NumeroCuarto,
        C.Capacidad,
        E.NombreCompleto AS Estudiante
      FROM Pasillos P
      INNER JOIN Cuartos C ON P.IdPasillo = C.IdPasillo
      LEFT JOIN Estudiantes E ON C.IdCuarto = E.IdCuarto
      ORDER BY P.NombrePasillo, C.NumeroCuarto
    `);
    
    // La consulta devuelve filas planas (repetidas por estudiante).
    // El frontend se encargará de agruparlas.
    res.json({ success: true, data: result.recordset });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener ocupación', error });
  }
});

export default router;