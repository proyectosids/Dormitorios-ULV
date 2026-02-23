import { Router } from "express";
import { getConnection } from "../db.js";
import sql from "mssql";
import { enviarNotificacion } from '../services/notification.service.js'; // Importado para avisar faltas

const router = Router();

router.post("/registrar", async (req, res) => {
  const { matriculaEstudiante, idTipoCulto, nombreTipoCulto, registradoPor, fecha } = req.body;

  if (!matriculaEstudiante || !registradoPor || (!idTipoCulto && !nombreTipoCulto)) {
    return res.status(400).json({
      success: false,
      message: "Faltan parámetros: matriculaEstudiante, registradoPor, (idTipoCulto o nombreTipoCulto)"
    });
  }

  try {
    const pool = await getConnection();

    let tipoCulto = idTipoCulto;
    if (!tipoCulto && nombreTipoCulto) {
      const tipo = await pool.request()
        .input("Nombre", sql.VarChar(50), nombreTipoCulto)
        .query("SELECT IdTipoCulto FROM dormi.Cat_TipoCulto WHERE Nombre = @Nombre");

      if (tipo.recordset.length === 0) {
        return res.status(400).json({ success: false, message: "Tipo de culto no existe" });
      }
      tipoCulto = tipo.recordset[0].IdTipoCulto;
    }

    const fechaAsistencia = fecha ? new Date(fecha) : new Date();

    await pool.request()
      .input("Matricula", sql.VarChar(10), matriculaEstudiante)
      .input("IdTipoCulto", sql.Int, tipoCulto)
      .input("Fecha", sql.Date, fechaAsistencia)
      .input("RegistradoPor", sql.VarChar(10), registradoPor)
      .query(`
        INSERT INTO dormi.AsistenciasCultos (MatriculaEstudiante, IdTipoCulto, Fecha, RegistradoPor)
        VALUES (@Matricula, @IdTipoCulto, @Fecha, @RegistradoPor)
      `);

    return res.json({ success: true, message: "Asistencia registrada ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al registrar asistencia", error });
  }
});

router.get("/culto", async (req, res) => {
  const { idTipoCulto, fecha } = req.query;

  if (!idTipoCulto) {
    return res.status(400).json({ 
        success: false, 
        message: "Falta el parámetro idTipoCulto" 
    });
  }

  try {
    const pool = await getConnection();
    const fechaBusqueda = fecha ? new Date(fecha) : new Date();

    const result = await pool.request()
      .input("IdTipoCulto", sql.Int, idTipoCulto)
      .input("Fecha", sql.Date, fechaBusqueda)
      .query(`
        SELECT 
          a.IdAsistencia,
          a.MatriculaEstudiante,
          e.NombreCompleto
        FROM dormi.AsistenciasCultos a
        INNER JOIN dormi.Estudiantes e ON a.MatriculaEstudiante = e.Matricula
        WHERE a.IdTipoCulto = @IdTipoCulto AND CONVERT(date, a.Fecha) = CONVERT(date, @Fecha)
        ORDER BY e.NombreCompleto;
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al obtener las asistencias del culto", error: error.message });
  }
});

// 1. Obtener lista de FALTANTES
router.get("/faltantes", async (req, res) => {
  const { idTipoCulto, fecha } = req.query;
  if (!idTipoCulto) return res.status(400).json({ success: false, message: "Falta idTipoCulto" });

  try {
    const pool = await getConnection();
    const fechaBusqueda = fecha ? new Date(fecha) : new Date();

    const result = await pool.request()
      .input("IdTipoCulto", sql.Int, idTipoCulto)
      .input("Fecha", sql.Date, fechaBusqueda)
      .query(`
        SELECT E.Matricula, E.NombreCompleto, E.Carrera
        FROM dormi.Estudiantes E
        WHERE E.Matricula NOT IN (
            SELECT MatriculaEstudiante 
            FROM dormi.AsistenciasCultos 
            WHERE IdTipoCulto = @IdTipoCulto 
            AND CONVERT(date, Fecha) = CONVERT(date, @Fecha)
        )
        ORDER BY E.NombreCompleto
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al buscar faltantes", error: error.message });
  }
});

// 2. REPORTAR FALTANTES MASIVAMENTE
router.post("/reportar-faltantes", async (req, res) => {
  const { listaMatriculas, idTipoCulto, fecha, reportadoPor } = req.body; 

  if (!listaMatriculas || listaMatriculas.length === 0 || !idTipoCulto || !reportadoPor) {
    return res.status(400).json({ success: false, message: "Faltan datos (matriculas, idTipoCulto, reportadoPor)." });
  }

  const pool = await getConnection();
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    const fechaReporte = fecha ? new Date(fecha) : new Date();

    const datosCulto = await new sql.Request(transaction)
      .input("IdTipoCulto", sql.Int, idTipoCulto)
      .query("SELECT Nombre FROM dormi.Cat_TipoCulto WHERE IdTipoCulto = @IdTipoCulto");
    
    const nombreCulto = datosCulto.recordset[0]?.Nombre || "Culto";
    let limiteFaltas = 3; 
    if (nombreCulto.toLowerCase().includes("vespertin")) {
      limiteFaltas = 2; 
    }

    for (const matricula of listaMatriculas) {
      const motivoFalta = `Falta injustificada a: ${nombreCulto}`;

      // Insertar en dormi.Reportes
      await new sql.Request(transaction)
        .input("Matricula", sql.VarChar(10), matricula)
        .input("ReportadoPor", sql.VarChar(10), reportadoPor)
        .input("TipoUsuario", sql.VarChar(50), 'Monitor')
        .input("Motivo", sql.VarChar(255), motivoFalta)
        .input("Fecha", sql.DateTime, new Date())
        .input("Estado", sql.VarChar(50), 'Aprobado')
        .input("IdTipoReporte", sql.Int, 2) // 2 = Disciplina
        .query(`
          INSERT INTO dormi.Reportes (MatriculaReportado, ReportadoPor, TipoUsuarioReportante, Motivo, FechaReporte, Estado, IdTipoReporte)
          VALUES (@Matricula, @ReportadoPor, @TipoUsuario, @Motivo, @Fecha, @Estado, @IdTipoReporte)
        `);

      // Enviar notificación de falta
      enviarNotificacion(
        matricula,
        "🚫 Falta a Culto",
        `Se ha generado un reporte por inasistencia a: ${nombreCulto}`
      );

      // Contar reportes de Disciplina en el mes
      const conteo = await new sql.Request(transaction)
        .input("Matricula", sql.VarChar(10), matricula)
        .input("Mes", sql.Int, fechaReporte.getMonth() + 1)
        .input("Anio", sql.Int, fechaReporte.getFullYear())
        .query(`
          SELECT COUNT(*) as Total 
          FROM dormi.Reportes 
          WHERE MatriculaReportado = @Matricula 
          AND IdTipoReporte = 2 
          AND MONTH(FechaReporte) = @Mes AND YEAR(FechaReporte) = @Anio
        `);
      
      const totalReportes = conteo.recordset[0].Total;

      // Amonestación Automática
      if (totalReportes > 0 && totalReportes % limiteFaltas === 0) {
          const motivoAmonestacion = `Acumulación de ${totalReportes} faltas a cultos (Límite: ${limiteFaltas})`;
          
          await new sql.Request(transaction)
            .input("Matricula", sql.VarChar(10), matricula)
            .input("ClavePreceptor", sql.VarChar(10), 'SISTEMA')
            .input("IdNivel", sql.Int, 1) // 1 = Leve
            .input("Fecha", sql.Date, fechaReporte)
            .input("Motivo", sql.VarChar(255), motivoAmonestacion)
            .query(`
              INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Fecha, Motivo) 
              VALUES (@Matricula, @ClavePreceptor, @IdNivel, @Fecha, @Motivo)
            `);

          // Enviar notificación de amonestación
          enviarNotificacion(
            matricula,
            "⚠️ Amonestación Generada",
            `Has acumulado ${totalReportes} reportes por faltas. Se generó una amonestación automática.`
          );
      }
    }

    await transaction.commit();
    res.json({ success: true, message: `Se generaron reportes para ${listaMatriculas.length} estudiantes.` });

  } catch (error) {
    await transaction.rollback();
    console.error("Error al reportar:", error);
    res.status(500).json({ success: false, message: "Error al generar reportes", error: error.message });
  }
});

export default router;