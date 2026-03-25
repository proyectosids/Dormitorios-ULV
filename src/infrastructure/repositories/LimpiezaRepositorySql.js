import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class LimpiezaRepositorySql {
    
    // 1. Obtener DETALLE (GET /detalle/:idCuarto)
    async obtenerUltimoDetalle(idCuarto) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('IdCuarto', sql.Int, idCuarto)
            .query(`
                SELECT TOP 1
                  L.IdLimpieza, L.Fecha, L.OrdenGeneral, L.Disciplina, L.TotalFinal, L.UrlFoto,
                  E.NombreCompleto AS EvaluadoPor, C.NumeroCuarto,
                  (SELECT SUM(Calificacion) FROM dormi.LimpiezaDetalle WHERE IdLimpieza = L.IdLimpieza) as Subtotal
                FROM dormi.Limpieza L
                LEFT JOIN dormi.Estudiantes E ON L.EvaluadoPorMatricula = E.Matricula 
                INNER JOIN dormi.Cuartos C ON L.IdCuarto = C.IdCuarto
                WHERE L.IdCuarto = @IdCuarto
                ORDER BY L.Fecha DESC, L.IdLimpieza DESC
            `);
        
        if (result.recordset.length === 0) return null;

        const idLimpieza = result.recordset[0].IdLimpieza;
        const detallesCriterios = await pool.request()
            .input('IdLimpieza', sql.Int, idLimpieza)
            .query(`
                SELECT C.Descripcion AS Criterio, LD.Calificacion
                FROM dormi.LimpiezaDetalle LD
                INNER JOIN dormi.CriteriosLimpieza C ON LD.IdCriterio = C.IdCriterio
                WHERE LD.IdLimpieza = @IdLimpieza
                ORDER BY C.IdCriterio
            `);

        return { ...result.recordset[0], Detalle: detallesCriterios.recordset };
    }

    // 2. REGISTRAR (POST /registrar) - Ya lo teníamos, pero asegúrate de que use estos nombres
    async guardar(limpieza, detalles) {
        const pool = await getConnection();
        const transaction = pool.transaction();
        try {
            await transaction.begin();
            const result = await new sql.Request(transaction)
                .input('IdCuarto', sql.Int, limpieza.idCuarto)
                .input('Fecha', sql.DateTime, limpieza.fecha)
                .input('EvaluadoPorMatricula', sql.VarChar(10), limpieza.evaluadoPorMatricula)
                .input('Observaciones', sql.VarChar(300), limpieza.observaciones)
                .input('OrdenGeneral', sql.Int, limpieza.ordenGeneral)
                .input('Disciplina', sql.Int, limpieza.disciplina)
                .input('TotalFinal', sql.Int, limpieza.totalFinal)
                .input('UrlFoto', sql.VarChar(sql.MAX), limpieza.urlFoto)
                .input('PublicIdFoto', sql.VarChar(100), limpieza.publicIdFoto)
                .query(`
                    INSERT INTO dormi.Limpieza (IdCuarto, Fecha, EvaluadoPorMatricula, Observaciones, OrdenGeneral, Disciplina, TotalFinal, UrlFoto, PublicIdFoto)
                    OUTPUT INSERTED.IdLimpieza
                    VALUES (@IdCuarto, @Fecha, @EvaluadoPorMatricula, @Observaciones, @OrdenGeneral, @Disciplina, @TotalFinal, @UrlFoto, @PublicIdFoto)
                `);

            const idLimpieza = result.recordset[0].IdLimpieza;
            for (const d of detalles) {
                await new sql.Request(transaction)
                    .input('IdLimpieza', sql.Int, idLimpieza)
                    .input('IdCriterio', sql.Int, d.idCriterio)
                    .input('Calificacion', sql.Int, d.calificacion)
                    .query('INSERT INTO dormi.LimpiezaDetalle (IdLimpieza, IdCriterio, Calificacion) VALUES (@IdLimpieza, @IdCriterio, @Calificacion)');
            }
            await transaction.commit();
            return idLimpieza;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // 3. Obtener CRITERIOS (GET /criterios)
    async listarCriterios() {
        const pool = await getConnection();
        const result = await pool.request().query(`SELECT IdCriterio, Descripcion FROM dormi.CriteriosLimpieza ORDER BY IdCriterio`);
        return result.recordset;
    }

    // 4. Obtener CUARTOS CON CALIFICACIÓN (GET /cuartos-con-calificacion)
    async listarCuartosConCalificacion() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            WITH UltimaLimpieza AS (
                SELECT IdCuarto, TotalFinal, ROW_NUMBER() OVER(PARTITION BY IdCuarto ORDER BY Fecha DESC, IdLimpieza DESC) as rn 
                FROM dormi.Limpieza
            )
            SELECT C.IdCuarto, C.NumeroCuarto, C.IdPasillo, UL.TotalFinal AS UltimaCalificacion 
            FROM dormi.Cuartos C
            LEFT JOIN UltimaLimpieza UL ON C.IdCuarto = UL.IdCuarto AND UL.rn = 1 
            ORDER BY C.IdPasillo, C.NumeroCuarto
        `);
        return result.recordset;
    }

    // 5. HISTORIAL (GET /historial/:idCuarto)
    async obtenerHistorial(idCuarto) {
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
        return result.recordset;
    }

    // 6. ESTADÍSTICAS (GET /estadisticas/generales)
    async obtenerFechaInicioSemestre(idSemestre) {
        const pool = await getConnection();
        if (idSemestre) {
            const res = await pool.request().input('Id', sql.Int, idSemestre)
            .query("SELECT FechaInicio FROM dormi.Semestres WHERE IdSemestre = @Id");
            return res.recordset[0]?.FechaInicio;
        } else {
            const res = await pool.request().query("SELECT TOP 1 FechaInicio FROM dormi.Semestres WHERE Activo = 1");
            return res.recordset[0]?.FechaInicio;
        }
    }

    async obtenerUltimosCortes(fechaSemestre) {
        const pool = await getConnection();
        const res = await pool.request()
            .input('FechaSemestre', sql.DateTime, fechaSemestre)
            .query(`
                SELECT TOP 2 FechaCorte FROM dormi.CortesLimpieza WHERE FechaCorte >= @FechaSemestre ORDER BY FechaCorte DESC
            `);
        return res.recordset;
    }

    async ejecutarQueryEstadistica(fechaIni, fechaFin) {
        const pool = await getConnection();
        const res = await pool.request().query(`
            SELECT ISNULL(P.Nombre, 'Sin Pasillo') AS Pasillo, AVG(CAST(L.TotalFinal AS FLOAT)) AS Promedio
            FROM dormi.Limpieza L
            INNER JOIN dormi.Cuartos C ON L.IdCuarto = C.IdCuarto
            LEFT JOIN dormi.Pasillos P ON C.IdPasillo = P.IdPasillo
            WHERE L.Fecha > '${new Date(fechaIni).toISOString()}' AND L.Fecha <= '${new Date(fechaFin).toISOString()}'
            AND ((DATEPART(dw, L.Fecha) + @@DATEFIRST - 1) % 7) != 6 
            GROUP BY P.Nombre ORDER BY Promedio DESC
        `);
        return res.recordset;
    }

    // 7. REALIZAR CORTE (POST /realizar-corte)
    async registrarCorte(realizadoPor) {
        const pool = await getConnection();
        await pool.request()
            .input('RealizadoPor', sql.VarChar(20), realizadoPor)
            .query(`
                INSERT INTO dormi.CortesLimpieza (FechaCorte, RealizadoPor) VALUES (GETDATE(), @RealizadoPor)
            `);
    }

    // 8. OBTENER SEMESTRES (GET /semestres-lista)
    async listarSemestres() {
        const pool = await getConnection();
        const res = await pool.request()
        .query(`
            SELECT IdSemestre, Nombre, Activo FROM dormi.Semestres ORDER BY IdSemestre DESC
        `);
        return res.recordset;
    }

    // Helper para notificaciones
    async obtenerEstudiantesPorCuarto(idCuarto) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('IdCuarto', sql.Int, idCuarto)
            .query("SELECT Matricula FROM dormi.Estudiantes WHERE IdCuarto = @IdCuarto");
        return result.recordset;
    }
}