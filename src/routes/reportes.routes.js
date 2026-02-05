import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// Subconsulta reutilizable para obtener el nombre de quien reportó
// Ajustada para usar el esquema 'dormi'
const getReportanteNombreQuery = `
  COALESCE(
    (SELECT NombreCompleto FROM dormi.Estudiantes WHERE Matricula = R.ReportadoPor AND R.TipoUsuarioReportante = 'Monitor'),
    (SELECT NombreCompleto FROM dormi.Preceptores WHERE ClaveEmpleado = R.ReportadoPor AND R.TipoUsuarioReportante = 'Preceptor'),
    'Sistema' 
  ) AS ReportadoPorNombre
`;

// ==========================================
// 1. GET Reportes de un estudiante
// ==========================================
router.get('/estudiante/:matricula', async (req, res) => {
  const { matricula } = req.params;
  console.log(`[API Reportes] GET /estudiante/${matricula}`);
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
          E.NombreCompleto AS NombreEstudianteReportado, 
          ${getReportanteNombreQuery} 
        FROM dormi.Reportes R
        INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula
        WHERE R.MatriculaReportado = @Matricula
        ORDER BY R.FechaReporte DESC
      `);
    console.log(`[API Reportes] GET /estudiante/${matricula} - Encontrados: ${result.recordset.length}`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error(`[API Reportes] Error en GET /estudiante/${matricula}:`, error);
    res.status(500).json({ success: false, message: 'Error al obtener reportes del estudiante', error: error.message });
  }
});

// ==========================================
// 2. CREAR REPORTE (Con Lógica de Acumulación)
// ==========================================
router.post('/crear', async (req, res) => {
  const { matriculaReportado, reportadoPor, tipoUsuarioReportante, motivo, idTipoReporte } = req.body;
  
  console.log(`[API Reportes] POST /crear - Alumno: ${matriculaReportado}, Tipo: ${idTipoReporte}`);

  if (!matriculaReportado || !reportadoPor || !motivo || !idTipoReporte) {
    return res.status(400).json({ success: false, message: 'Faltan datos (matricula, reportador, motivo, tipo).' });
  }

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    // Iniciamos transacción (Todo o nada)
    await transaction.begin();

    try {
      const estado = tipoUsuarioReportante === 'Preceptor' ? 'Aprobado' : 'Pendiente';
      const fechaAprobacion = tipoUsuarioReportante === 'Preceptor' ? new Date() : null;
      const preceptorAprobador = tipoUsuarioReportante === 'Preceptor' ? reportadoPor : null;

      // 1. INSERTAR EL REPORTE
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
          INSERT INTO dormi.Reportes
            (MatriculaReportado, ReportadoPor, TipoUsuarioReportante, Motivo, Estado, ClavePreceptorAprobador, FechaAprobacion, IdTipoReporte)
          VALUES
            (@MatriculaReportado, @ReportadoPor, @TipoUsuarioReportante, @Motivo, @Estado, @ClavePreceptorAprobador, @FechaAprobacion, @IdTipoReporte)
        `);

      // 2. VALIDACIÓN DE ACUMULACIÓN (3 Reportes = Amonestación)
      // Contamos reportes del MISMO TIPO en el MES ACTUAL
      const countResult = await transaction.request()
        .input('Matricula', sql.VarChar(10), matriculaReportado)
        .input('IdTipoReporte', sql.Int, idTipoReporte)
        .query(`
          SELECT COUNT(*) as Total 
          FROM dormi.Reportes 
          WHERE MatriculaReportado = @Matricula
          AND IdTipoReporte = @IdTipoReporte
          AND MONTH(FechaReporte) = MONTH(GETDATE()) -- Mismo Mes
          AND YEAR(FechaReporte) = YEAR(GETDATE())   -- Mismo Año
        `);

      const totalDelMes = countResult.recordset[0].Total;
      let mensajeExtra = '';

      // Si es múltiplo de 3 (3, 6, 9...)
      if (totalDelMes > 0 && totalDelMes % 3 === 0) {
        
        // Obtenemos nombre del mes y tipo para el mensaje
        const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        
        // Mapeo manual rápido para el mensaje
        let nombreTipo = 'GENERAL';
        if(idTipoReporte == 1) nombreTipo = 'LIMPIEZA';
        if(idTipoReporte == 2) nombreTipo = 'DISCIPLINA';
        if(idTipoReporte == 3) nombreTipo = 'DAÑOS';

        console.log(`[Sistema] Alumno ${matriculaReportado} acumuló 3 reportes de ${nombreTipo}. Generando amonestación...`);

        // 3. GENERAR AMONESTACIÓN AUTOMÁTICA
        // Asignamos Nivel 1 (Leve) por defecto.
        // OJO: 'SISTEMA' debe existir en dormi.Preceptores
        await transaction.request()
          .input('MatriculaEstudiante', sql.VarChar(10), matriculaReportado)
          .input('ClavePreceptor', sql.VarChar(10), 'SISTEMA') 
          .input('IdNivel', sql.Int, 1) // Nivel 1 = Leve
          .input('Motivo', sql.VarChar(200), `Acumulación de 3 reportes de ${nombreTipo} en ${mesActual} (Automática)`)
          .input('Fecha', sql.Date, new Date())
          .query(`
            INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Motivo, Fecha)
            VALUES (@MatriculaEstudiante, @ClavePreceptor, @IdNivel, @Motivo, @Fecha)
          `);
          
        mensajeExtra = ' ¡Se generó una amonestación automática!';
      }

      await transaction.commit();
      
      res.status(201).json({ 
        success: true, 
        message: `Reporte creado correctamente.${mensajeExtra}` 
      });

    } catch (err) {
      await transaction.rollback();
      console.error('[API Reportes] Error transacción:', err);
      // Validar errores específicos de SQL
      if (err.number === 547) {
         return res.status(400).json({ success: false, message: 'Error de referencia (Matrícula o Tipo no existen).' });
      }
      throw err; // Lanzar al catch general
    }

  } catch (error) {
    console.error('[API Reportes] Error General:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
});

// ==========================================
// 3. VER TODOS LOS REPORTES (Paginación + Buscador)
// ==========================================
router.get('/', async (req, res) => {
  console.log(`[API Reportes] GET / (Todos)`);
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
      SELECT
        R.IdReporte,
        R.MatriculaReportado,
        E.NombreCompleto AS NombreEstudiante,
        R.ReportadoPor,
        R.TipoUsuarioReportante,
        R.Motivo,
        R.FechaReporte,
        R.Estado,
        ${getReportanteNombreQuery}
      FROM dormi.Reportes R
      INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula
      ${whereClause} 
      ORDER BY R.FechaReporte DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY; 
    `;

     const countQuery = `
      SELECT COUNT(*) as total
      FROM dormi.Reportes R
      INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula
      ${whereClause}; 
    `;

    const result = await request.query(query); 
    const totalResult = await request.query(countQuery); 

    const totalReportes = totalResult.recordset[0].total;

    console.log(`[API Reportes] GET / (Todos) - Encontrados: ${result.recordset.length} (Total: ${totalReportes})`);
    res.json({ 
      success: true, 
      data: result.recordset,
      total: totalReportes, 
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('[API Reportes] Error en GET / (Todos):', error);
    res.status(500).json({ success: false, message: 'Error al obtener todos los reportes', error: error.message });
  }
});

// ==========================================
// 4. APROBAR REPORTE
// ==========================================
router.put('/:idReporte/aprobar', async (req, res) =>{
  const { idReporte } = req.params;
  const { preceptorId } = req.body; 
  
  if(!preceptorId) {
    return res.status(400).json({ success: false, message: 'Falta el ID del preceptor que aprueba.'});
  }

    console.log(`[API Reportes] PUT /${idReporte}/aprobar por ${preceptorId}`);
    try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('IdReporte', sql.Int, idReporte)
      .input('PreceptorId', sql.VarChar(10), preceptorId)
      .input('FechaAprobacion', sql.DateTime, new Date())
      .query(`
        UPDATE dormi.Reportes
        SET 
          Estado = 'Aprobado',
          ClavePreceptorAprobador = @PreceptorId,
          FechaAprobacion = @FechaAprobacion
        WHERE IdReporte = @IdReporte AND Estado = 'Pendiente'
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Reporte aprobado correctamente.' });
    } else {
      res.status(404).json({ success: false, message: 'El reporte no existe o ya estaba aprobado/rechazado.' });
    }
  } catch (error) {
    console.error(`[API Reportes] Error en PUT /${idReporte}/aprobar:`, error);
    res.status(500).json({ success: false, message: 'Error en el servidor al aprobar el reporte.', error: error.message });
  }
  });

// ==========================================
// 5. RECHAZAR REPORTE
// ==========================================
router.put('/:idReporte/rechazar', async (req, res) => {
  const { idReporte } = req.params;

  console.log(`[API Reportes] PUT /${idReporte}/rechazar`);
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('IdReporte', sql.Int, idReporte)
      .query(`
        UPDATE dormi.Reportes
        SET Estado = 'Rechazado'
        WHERE IdReporte = @IdReporte AND Estado = 'Pendiente'
      `);
      
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Reporte rechazado correctamente.' });
    } else {
      res.status(404).json({ success: false, message: 'El reporte no existe o ya estaba aprobado/rechazado.' });
    }
  } catch (error) {
    console.error(`[API Reportes] Error en PUT /${idReporte}/rechazar:`, error);
    res.status(500).json({ success: false, message: 'Error en el servidor al rechazar el reporte.', error: error.message });
  }
});

export default router;