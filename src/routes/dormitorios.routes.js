import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// 0. Obtener lista de DORMITORIOS (Edificios)
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM dormi.Dormitorios');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener dormitorios', error });
  }
});

// 1. Obtener todos los PASILLOS
router.get('/pasillos', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM dormi.Pasillos');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pasillos', error });
  }
});

// 2. Obtener CUARTOS de un pasillo específico
router.get('/cuartos', async (req, res) => {
  const { idPasillo } = req.query;

  if (!idPasillo) {
    return res.status(400).json({ success: false, message: 'Falta el idPasillo' });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('IdPasillo', sql.Int, idPasillo)
      .query(`
        SELECT * FROM dormi.Cuartos 
        WHERE IdPasillo = @IdPasillo
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
      FROM dormi.Pasillos P
      INNER JOIN dormi.Cuartos C ON P.IdPasillo = C.IdPasillo
      LEFT JOIN dormi.Estudiantes E ON C.IdCuarto = E.IdCuarto
      ORDER BY P.NombrePasillo, C.NumeroCuarto
    `);
    
    res.json({ success: true, data: result.recordset });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener ocupación', error });
  }
});

export default router;