import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';
import { enviarNotificacion } from '../services/notification.service.js';

const router = Router();

// 1. Obtener DETALLE de limpieza
router.get('/detalle/:idCuarto', async (req, res) => {
  const { idCuarto } = req.params;
  try {
    const pool = await getConnection();
    const limpieza = await pool.request()
      .input('IdCuarto', sql.Int, idCuarto)
      .query(`
        SELECT TOP 1
          L.IdLimpieza, L.Fecha, L.OrdenGeneral, L.Disciplina, L.TotalFinal,
          E.NombreCompleto AS EvaluadoPor, 
          C.NumeroCuarto,
          (SELECT SUM(Calificacion) FROM dormi.LimpiezaDetalle WHERE IdLimpieza = L.IdLimpieza) as Subtotal
        FROM dormi.Limpieza L
        LEFT JOIN dormi.Estudiantes E ON L.EvaluadoPorMatricula = E.Matricula 
        INNER JOIN dormi.Cuartos C ON L.IdCuarto = C.IdCuarto
        WHERE L.IdCuarto = @IdCuarto
        ORDER BY L.Fecha DESC, L.IdLimpieza DESC
      `);

    if (limpieza.recordset.length === 0) {
      return res.json({ success: true, data: null, message: 'No hay registros de limpieza para este cuarto' });
    }
    const idLimpieza = limpieza.recordset[0].IdLimpieza;
    const detalle = await pool.request()
      .input('IdLimpieza', sql.Int, idLimpieza)
      .query(`
        SELECT C.Descripcion AS Criterio, LD.Calificacion
        FROM dormi.LimpiezaDetalle LD
        INNER JOIN dormi.CriteriosLimpieza C ON LD.IdCriterio = C.IdCriterio
        WHERE LD.IdLimpieza = @IdLimpieza
        ORDER BY C.IdCriterio
      `);
    res.json({
      success: true,
      data: { ...limpieza.recordset[0], Detalle: detalle.recordset }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener el detalle', error: error.message });
  }
});

// 2. REGISTRAR Limpieza (CON NOTIFICACIONES PUSH)
router.post('/registrar', async (req, res) => {
  const { idCuarto, evaluadoPor, detallesMatutinos, ordenGeneral, disciplina, observaciones } = req.body;
  
  if (!idCuarto || !evaluadoPor || !Array.isArray(detallesMatutinos) || detallesMatutinos.length === 0 || ordenGeneral === undefined || disciplina === undefined) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos.' });
  }
  
  const pool = await getConnection();
  const transaction = pool.transaction(); 
  try {
    await transaction.begin();
    const subtotal = detallesMatutinos.reduce((acc, item) => acc + (parseInt(item.calificacion, 10) || 0), 0);
    const totalFinal = subtotal + (parseInt(ordenGeneral, 10) || 0) + (parseInt(disciplina, 10) || 0);
    
    const limpiezaResult = await new sql.Request(transaction)
      .input('IdCuarto', sql.Int, idCuarto)
      .input('Fecha', sql.DateTime, new Date())
      .input('EvaluadoPorMatricula', sql.VarChar(10), evaluadoPor)
      .input('Observaciones', sql.VarChar(300), observaciones || null)
      .input('OrdenGeneral', sql.Int, ordenGeneral)
      .input('Disciplina', sql.Int, disciplina)
      .input('TotalFinal', sql.Int, totalFinal)
      .query(`
        INSERT INTO dormi.Limpieza (IdCuarto, Fecha, EvaluadoPorMatricula, Observaciones, OrdenGeneral, Disciplina, TotalFinal)
        OUTPUT INSERTED.IdLimpieza
        VALUES (@IdCuarto, @Fecha, @EvaluadoPorMatricula, @Observaciones, @OrdenGeneral, @Disciplina, @TotalFinal)
      `);
      
    const idLimpieza = limpiezaResult.recordset[0].IdLimpieza;
    
    for (const detalle of detallesMatutinos) {
      await new sql.Request(transaction)
        .input('IdLimpieza', sql.Int, idLimpieza)
        .input('IdCriterio', sql.Int, detalle.idCriterio)
        .input('Calificacion', sql.Int, detalle.calificacion)
        .query('INSERT INTO dormi.LimpiezaDetalle (IdLimpieza, IdCriterio, Calificacion) VALUES (@IdLimpieza, @IdCriterio, @Calificacion)');
    }
    
    await transaction.commit();

    // --- NOTIFICACIONES ---
    try {
        const resultEstudiantes = await pool.request()
            .input('IdCuarto', sql.Int, idCuarto)
            .query("SELECT Matricula FROM dormi.Estudiantes WHERE IdCuarto = @IdCuarto");

        resultEstudiantes.recordset.forEach(estudiante => {
            enviarNotificacion(
                estudiante.Matricula,
                "🏠 Limpieza Calificada",
                `Tu cuarto ha sido evaluado hoy con un total de ${totalFinal} puntos.`
            );
        });
    } catch (errNotif) {
        console.error("Error notificaciones limpieza:", errNotif);
    }

    res.status(201).json({ success: true, message: 'Limpieza registrada exitosamente', idLimpieza });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: 'Error al registrar la limpieza', error: error.message });
  }
});

// 3. Obtener CRITERIOS
router.get('/criterios', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`SELECT IdCriterio, Descripcion FROM dormi.CriteriosLimpieza ORDER BY IdCriterio`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener criterios', error: error.message });
  }
});

// 4. Obtener CUARTOS CON CALIFICACIÓN
router.get('/cuartos-con-calificacion', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      WITH UltimaLimpieza AS (
        SELECT 
          IdCuarto, TotalFinal, 
          ROW_NUMBER() OVER(PARTITION BY IdCuarto ORDER BY Fecha DESC, IdLimpieza DESC) as rn 
        FROM dormi.Limpieza
      )
      SELECT C.IdCuarto, C.NumeroCuarto, C.IdPasillo, UL.TotalFinal AS UltimaCalificacion 
      FROM dormi.Cuartos C
      LEFT JOIN UltimaLimpieza UL ON C.IdCuarto = UL.IdCuarto AND UL.rn = 1 
      ORDER BY C.IdPasillo, C.NumeroCuarto;
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cuartos', error: error.message });
  }
});

// 5. HISTORIAL
router.get('/historial/:idCuarto', async (req, res) => {
  const { idCuarto } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('IdCuarto', sql.Int, idCuarto)
      .query(`
        SELECT l.IdLimpieza, l.Fecha, l.TotalFinal, e.NombreCompleto AS EvaluadoPor 
        FROM dormi.Limpieza l 
        LEFT JOIN dormi.Estudiantes e ON l.EvaluadoPorMatricula = e.Matricula 
        WHERE l.IdCuarto = @IdCuarto 
        ORDER BY l.Fecha DESC, l.IdLimpieza DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener historial', error: error.message });
  }
});

// 6. OBTENER ESTADÍSTICAS
router.get('/estadisticas/generales', async (req, res) => {
  const { idSemestre } = req.query;
  try {
    const pool = await getConnection();
    let fechaInicioSemestre = '2025-01-01'; 
    
    if (idSemestre) {
        const sem = await pool.request().input('Id', sql.Int, idSemestre).query("SELECT FechaInicio FROM dormi.Semestres WHERE IdSemestre = @Id");
        if (sem.recordset.length > 0) fechaInicioSemestre = sem.recordset[0].FechaInicio;
    } else {
        const sem = await pool.request().query("SELECT TOP 1 FechaInicio FROM dormi.Semestres WHERE Activo = 1");
        if (sem.recordset.length > 0) fechaInicioSemestre = sem.recordset[0].FechaInicio;
    }

    const cortes = await pool.request()
      .input('FechaSemestre', sql.DateTime, fechaInicioSemestre)
      .query(`SELECT TOP 2 FechaCorte FROM dormi.CortesLimpieza WHERE FechaCorte >= @FechaSemestre ORDER BY FechaCorte DESC`);

    let inicioEnCurso = (cortes.recordset.length > 0) ? cortes.recordset[0].FechaCorte : fechaInicioSemestre;
    let inicioPublicado = (cortes.recordset.length > 1) ? cortes.recordset[1].FechaCorte : fechaInicioSemestre;
    let finPublicado = (cortes.recordset.length > 0) ? cortes.recordset[0].FechaCorte : new Date();

    const queryBase = (fechaIni, fechaFin) => `
      SELECT ISNULL(P.Nombre, 'Sin Pasillo') AS Pasillo, AVG(CAST(L.TotalFinal AS FLOAT)) AS Promedio
      FROM dormi.Limpieza L
      INNER JOIN dormi.Cuartos C ON L.IdCuarto = C.IdCuarto
      LEFT JOIN dormi.Pasillos P ON C.IdPasillo = P.IdPasillo
      WHERE L.Fecha > '${new Date(fechaIni).toISOString()}' AND L.Fecha <= '${new Date(fechaFin).toISOString()}'
        AND ((DATEPART(dw, L.Fecha) + @@DATEFIRST - 1) % 7) != 6 
      GROUP BY P.Nombre ORDER BY Promedio DESC
    `;

    const statsEnCurso = await pool.request().query(queryBase(inicioEnCurso, new Date()));
    const statsPublicadas = await pool.request().query(queryBase(inicioPublicado, finPublicado));

    res.json({ success: true, data: { enCurso: statsEnCurso.recordset, publicadas: statsPublicadas.recordset, ultimoCorte: inicioEnCurso }});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// 7. REALIZAR CORTE
router.post('/realizar-corte', async (req, res) => {
  const { realizadoPor } = req.body; 
  try {
    const pool = await getConnection();
    await pool.request()
      .input('RealizadoPor', sql.VarChar(20), realizadoPor)
      .query(`INSERT INTO dormi.CortesLimpieza (FechaCorte, RealizadoPor) VALUES (GETDATE(), @RealizadoPor)`);
    res.json({ success: true, message: 'Corte realizado.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al realizar corte' });
  }
});

// 8. OBTENER SEMESTRES
router.get('/semestres-lista', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`SELECT IdSemestre, Nombre, Activo FROM dormi.Semestres ORDER BY IdSemestre DESC`);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}); 

export default router;