import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// 1. GET: Listar todos
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        e.Matricula, 
        e.NombreCompleto, 
        e.Carrera, 
        e.IdCuarto,
        c.NumeroCuarto
      FROM dormi.Estudiantes e
      INNER JOIN dormi.Cuartos c ON e.IdCuarto = c.IdCuarto
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estudiantes', error });
  }
});

// 2. GET: Estudiantes para asignación
router.get('/para-asignacion', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        E.Matricula, 
        E.NombreCompleto, 
        E.IdCuarto,
        C.NumeroCuarto AS CuartoActual
      FROM dormi.Estudiantes E
      LEFT JOIN dormi.Cuartos C ON E.IdCuarto = C.IdCuarto
      ORDER BY E.NombreCompleto ASC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estudiantes' });
  }
});

// 3. PUT: Asignar cuarto
router.put('/asignar-cuarto', async (req, res) => {
  const { matricula, idDormitorio, idPasillo, idCuarto } = req.body;

  if (!matricula || !idDormitorio || !idPasillo || !idCuarto) {
    return res.status(400).json({ success: false, message: 'Faltan datos.' });
  }

  try {
    const pool = await getConnection();
    await pool.request()
      .input('Matricula', sql.VarChar(10), matricula)
      .input('IdDormitorio', sql.Int, idDormitorio)
      .input('IdPasillo', sql.Int, idPasillo)
      .input('IdCuarto', sql.Int, idCuarto)
      .query(`
        UPDATE dormi.Estudiantes
        SET
          IdDormitorio = @IdDormitorio, 
          IdPasillo = @IdPasillo,
          IdCuarto = @IdCuarto
        WHERE Matricula = @Matricula
      `);

    res.json({ success: true, message: 'Asignación completa guardada.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al asignar cuarto.' });
  }
});

// 4. GET: Obtener FOTO de perfil (Base de datos externa SIAE)
router.get('/:matricula/foto', async (req, res) => {
  const { matricula } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('Matricula', sql.VarChar(20), matricula)
      .query(`
        SELECT TOP 1 documentoDigital 
        FROM [IDS-APP].[dbo].[controlEscolar_DocumentosAlumno] 
        WHERE alu1Matricula = @Matricula 
          AND claveDocumento = 'FOTO' 
          AND documentoDigital IS NOT NULL
      `);

    if (result.recordset.length > 0) {
      const imagenBuffer = result.recordset[0].documentoDigital;
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(imagenBuffer);
    } else {
      res.status(404).send('Foto no encontrada');
    }
  } catch (error) {
    res.status(500).send('Error del servidor');
  }
});

// 5. GET: Buscar por matrícula
router.get('/:matricula', async (req, res) => {
  const { matricula } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('Matricula', sql.VarChar(10), matricula)
      .query(`
        SELECT 
          e.Matricula, 
          e.NombreCompleto, 
          e.Carrera, 
          e.IdCuarto,
          c.NumeroCuarto
        FROM dormi.Estudiantes e
        LEFT JOIN dormi.Cuartos c ON e.IdCuarto = c.IdCuarto
        WHERE e.Matricula = @Matricula
      `);

    if (result.recordset.length === 0)
      return res.json({ success: false, message: 'Estudiante no encontrado' });

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al buscar estudiante', error });
  }
});

// 6. PUT: Actualizar datos básicos
router.put('/:matricula', async (req, res) => {
  const { matricula } = req.params;
  const { nombreCompleto, carrera, idCuarto } = req.body;

  try {
    const pool = await getConnection();
    await pool.request()
      .input('Matricula', sql.VarChar(10), matricula)
      .input('NombreCompleto', sql.VarChar(100), nombreCompleto)
      .input('Carrera', sql.VarChar(100), carrera)
      .input('IdCuarto', sql.Int, idCuarto)
      .query(`
        UPDATE dormi.Estudiantes
        SET NombreCompleto = @NombreCompleto,
            Carrera = @Carrera,
            IdCuarto = @IdCuarto
        WHERE Matricula = @Matricula
      `);

    res.json({ success: true, message: 'Estudiante actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar estudiante', error });
  }
});

export default router;