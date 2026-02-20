import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';
import { enviarNotificacion } from '../services/notification.service.js';

const router = Router();

const getReportanteNombreQuery = `
  COALESCE(
    (SELECT NombreCompleto FROM dormi.Estudiantes WHERE Matricula = R.ReportadoPor AND R.TipoUsuarioReportante = 'Monitor'),
    (SELECT NombreCompleto FROM dormi.Preceptores WHERE ClaveEmpleado = R.ReportadoPor AND R.TipoUsuarioReportante = 'Preceptor'),
    'Sistema' 
  ) AS ReportadoPorNombre
`;

// 1. OBTENER REPORTES POR ESTUDIANTE
router.get('/estudiante/:matricula', async (req, res) => {
  const { matricula } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('Matricula', sql.VarChar(10), matricula)
      .query(`
        SELECT
          R.IdReporte,
          R.Motivo,
          R.FechaReporte,
          R.Estado,
          R.FirmaEstudiante,
          E.NombreCompleto AS NombreEstudianteReportado, 
          ${getReportanteNombreQuery} 
        FROM dormi.Reportes R
        INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula
        WHERE R.MatriculaReportado = @Matricula
        ORDER BY R.FechaReporte DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener reportes', error: error.message });
  }
});

// 2. CREAR REPORTE (CON NOTIFICACIÓN Y ACUMULACIÓN)
router.post('/crear', async (req, res) => {
  const { matriculaReportado, reportadoPor, tipoUsuarioReportante, motivo, idTipoReporte } = req.body;

  if (!matriculaReportado || !reportadoPor || !motivo || !idTipoReporte) {
    return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
  }

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const estado = tipoUsuarioReportante === 'Preceptor' ? 'Aprobado' : 'Pendiente';
      const fechaAprobacion = tipoUsuarioReportante === 'Preceptor' ? new Date() : null;
      const preceptorAprobador = tipoUsuarioReportante === 'Preceptor' ? reportadoPor : null;

      // Insertar Reporte en dormi.Reportes
      await transaction.request()
        .input('MatriculaReportado', sql.VarChar(10), matriculaReportado)
        .input('ReportadoPor', sql.VarChar(10), reportadoPor)
        .input('TipoUsuarioReportante', sql.VarChar(15), tipoUsuarioReportante)
        .input('Motivo', sql.Text, motivo)
        .input('Estado', sql.VarChar(20), estado)
        .input('ClavePreceptorAprobador', sql.VarChar(10), preceptorAprobador)
        .input('FechaAprobacion', sql.DateTime, fechaAprobacion)
        .input('IdTipoReporte', sql.Int, idTipoReporte)
        .query(`
          INSERT INTO dormi.Reportes (MatriculaReportado, ReportadoPor, TipoUsuarioReportante, Motivo, Estado, ClavePreceptorAprobador, FechaAprobacion, IdTipoReporte)
          VALUES (@MatriculaReportado, @ReportadoPor, @TipoUsuarioReportante, @Motivo, @Estado, @ClavePreceptorAprobador, @FechaAprobacion, @IdTipoReporte)
        `);

      // Lógica de acumulación en el mes actual
      const countResult = await transaction.request()
        .input('Matricula', sql.VarChar(10), matriculaReportado)
        .input('IdTipoReporte', sql.Int, idTipoReporte)
        .query(`
          SELECT COUNT(*) as Total FROM dormi.Reportes 
          WHERE MatriculaReportado = @Matricula AND IdTipoReporte = @IdTipoReporte
          AND MONTH(FechaReporte) = MONTH(GETDATE()) AND YEAR(FechaReporte) = YEAR(GETDATE())
        `);

      const totalDelMes = countResult.recordset[0].Total;
      let amonestacionGenerada = false;

      if (totalDelMes > 0 && totalDelMes % 3 === 0) {
        const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        await transaction.request()
          .input('MatriculaEstudiante', sql.VarChar(10), matriculaReportado)
          .input('ClavePreceptor', sql.VarChar(10), 'SISTEMA')
          .input('IdNivel', sql.Int, 1) // Nivel leve por defecto
          .input('Motivo', sql.VarChar(200), `Acumulación de 3 reportes en ${mesActual} (Automática)`)
          .input('Fecha', sql.Date, new Date())
          .query(`
            INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Motivo, Fecha)
            VALUES (@MatriculaEstudiante, @ClavePreceptor, @IdNivel, @Motivo, @Fecha)
          `);
        amonestacionGenerada = true;
      }

      await transaction.commit();

      // --- NOTIFICACIONES ---
      enviarNotificacion(
        matriculaReportado,
        "📋 Nuevo Reporte",
        `Se ha registrado un nuevo reporte: ${motivo}`
      );

      if (amonestacionGenerada) {
        enviarNotificacion(
          matriculaReportado,
          "⚠️ Amonestación Automática",
          "Has acumulado 3 reportes en el mes. Se ha generado una amonestación."
        );
      }

      res.status(201).json({ success: true, message: 'Reporte creado con éxito.' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
});

// 3. VER TODOS LOS REPORTES (PAGINADOS)
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search } = req.query; 
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const pool = await getConnection();
    let whereClause = '';
    const request = pool.request(); 

    if (search && search.trim() !== '') {
      whereClause = `WHERE R.MatriculaReportado LIKE @Search OR E.NombreCompleto LIKE @Search`;
      request.input('Search', sql.VarChar, `%${search}%`); 
    }

    const query = `
      SELECT R.IdReporte, R.MatriculaReportado, E.NombreCompleto AS NombreEstudiante,
        R.ReportadoPor, R.TipoUsuarioReportante, R.Motivo, R.FechaReporte, R.Estado, R.FirmaEstudiante,
        ${getReportanteNombreQuery}
      FROM dormi.Reportes R
      INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula
      ${whereClause}
      ORDER BY R.FechaReporte DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY;
    `;

    const result = await request.query(query); 
    const totalResult = await request.query(`SELECT COUNT(*) as total FROM dormi.Reportes R INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula ${whereClause}`); 

    res.json({ 
      success: true, 
      data: result.recordset,
      total: totalResult.recordset[0].total, 
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener reportes', error: error.message });
  }
});

// 4. APROBAR REPORTE (CON NOTIFICACIÓN)
router.put('/:idReporte/aprobar', async (req, res) =>{
  const { idReporte } = req.params;
  const { preceptorId } = req.body; 
  
  if(!preceptorId) return res.status(400).json({ success: false, message: 'Falta ID del preceptor.'});

  try {
    const pool = await getConnection();
    
    // Obtener matrícula antes de actualizar
    const infoResult = await pool.request()
      .input('Id', sql.Int, idReporte)
      .query("SELECT MatriculaReportado, Motivo FROM dormi.Reportes WHERE IdReporte = @Id");

    const result = await pool.request()
      .input('IdReporte', sql.Int, idReporte)
      .input('PreceptorId', sql.VarChar(10), preceptorId)
      .input('FechaAprobacion', sql.DateTime, new Date())
      .query(`
        UPDATE dormi.Reportes SET Estado = 'Aprobado', ClavePreceptorAprobador = @PreceptorId, FechaAprobacion = @FechaAprobacion
        WHERE IdReporte = @IdReporte AND Estado = 'Pending' OR Estado = 'Pendiente'
      `);
    
    if (result.rowsAffected[0] > 0) {
      const { MatriculaReportado, Motivo } = infoResult.recordset[0];
      
      enviarNotificacion(
        MatriculaReportado,
        "✅ Reporte Aprobado",
        `Tu reporte "${Motivo}" ha sido aprobado. Favor de pasar a firmar.`
      );

      res.json({ success: true, message: 'Reporte aprobado correctamente.' });
    } else {
      res.status(404).json({ success: false, message: 'No se pudo aprobar el reporte.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
});

// 5. RECHAZAR REPORTE
router.put('/:idReporte/rechazar', async (req, res) => {
  const { idReporte } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('IdReporte', sql.Int, idReporte)
      .query("UPDATE dormi.Reportes SET Estado = 'Rechazado' WHERE IdReporte = @IdReporte AND (Estado = 'Pending' OR Estado = 'Pendiente')");
      
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Reporte rechazado correctamente.' });
    } else {
      res.status(404).json({ success: false, message: 'No se pudo rechazar.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
});

export default router;