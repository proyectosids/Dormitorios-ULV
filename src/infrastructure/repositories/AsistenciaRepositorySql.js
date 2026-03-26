import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class AsistenciaRepositorySql {
    async buscarIdTipoCultoPorNombre(nombre) {
        const pool = await getConnection();
        const result = await pool.request()
            .input("Nombre", sql.VarChar(50), nombre)
            .query("SELECT IdTipoCulto FROM dormi.Cat_TipoCulto WHERE Nombre = @Nombre");
        return result.recordset[0]?.IdTipoCulto;
    }

    async registrar(asistencia) {
        const pool = await getConnection();
        await pool.request()
            .input("Matricula", sql.VarChar(10), asistencia.matriculaEstudiante)
            .input("IdTipo", sql.Int, asistencia.idTipoCulto)
            .input("Fecha", sql.Date, asistencia.fecha)
            .input("Por", sql.VarChar(10), asistencia.registradoPor)
            .query(`INSERT INTO dormi.AsistenciasCultos (MatriculaEstudiante, IdTipoCulto, Fecha, RegistradoPor)
                    VALUES (@Matricula, @IdTipo, @Fecha, @Por)`);
    }

    async obtenerAsistenciasPorCulto(idTipoCulto, fecha) {
        const pool = await getConnection();
        const result = await pool.request()
            .input("Id", sql.Int, idTipoCulto)
            .input("Fecha", sql.Date, fecha)
            .query(`SELECT a.IdAsistencia, a.MatriculaEstudiante, e.NombreCompleto
                    FROM dormi.AsistenciasCultos a
                    INNER JOIN dormi.Estudiantes e ON a.MatriculaEstudiante = e.Matricula
                    WHERE a.IdTipoCulto = @Id AND CONVERT(date, a.Fecha) = CONVERT(date, @Fecha)`);
        return result.recordset;
    }

    async obtenerFaltantes(idTipoCulto, fecha) {
        const pool = await getConnection();
        const result = await pool.request()
            .input("Id", sql.Int, idTipoCulto)
            .input("Fecha", sql.Date, fecha)
            .query(`SELECT E.Matricula, E.NombreCompleto, E.Carrera FROM dormi.Estudiantes E
                    WHERE E.Matricula NOT IN (SELECT MatriculaEstudiante FROM dormi.AsistenciasCultos 
                    WHERE IdTipoCulto = @Id AND CONVERT(date, Fecha) = CONVERT(date, @Fecha))`);
        return result.recordset;
    }

    async procesarReportesMasivos(listaMatriculas, idTipoCulto, reportadoPor, fecha) {
        const pool = await getConnection();
        const transaction = pool.transaction();
        try {
            await transaction.begin();
            
            // Obtener info del culto para lógica de límites
            const culto = await new sql.Request(transaction)
                .input("Id", sql.Int, idTipoCulto).query("SELECT Nombre FROM dormi.Cat_TipoCulto WHERE IdTipoCulto = @Id");
            
            const nombreCulto = culto.recordset[0]?.Nombre || "Culto";
            const limiteFaltas = nombreCulto.toLowerCase().includes("vespertin") ? 2 : 3;

            for (const matricula of listaMatriculas) {
                // 1. Insertar Reporte
                await new sql.Request(transaction)
                    .input("Mat", sql.VarChar(10), matricula)
                    .input("Por", sql.VarChar(10), reportadoPor)
                    .input("Mot", sql.VarChar(255), `Falta injustificada a: ${nombreCulto}`)
                    .query(`INSERT INTO dormi.Reportes (MatriculaReportado, ReportadoPor, TipoUsuarioReportante, Motivo, FechaReporte, Estado, IdTipoReporte)
                            VALUES (@Mat, @Por, 'Monitor', @Mot, GETDATE(), 'Aprobado', 2)`);

                // 2. Contar acumulados del mes
                const conteo = await new sql.Request(transaction)
                    .input("Mat", sql.VarChar(10), matricula)
                    .query(`SELECT COUNT(*) as Total FROM dormi.Reportes WHERE MatriculaReportado = @Mat 
                            AND IdTipoReporte = 2 AND MONTH(FechaReporte) = MONTH(GETDATE()) AND YEAR(FechaReporte) = YEAR(GETDATE())`);

                const total = conteo.recordset[0].Total;

                // 3. Amonestación Automática
                if (total > 0 && total % limiteFaltas === 0) {
                    await new sql.Request(transaction)
                        .input("Mat", sql.VarChar(10), matricula)
                        .input("Mot", sql.VarChar(255), `Acumulación de ${total} faltas (Límite: ${limiteFaltas})`)
                        .query(`INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Fecha, Motivo) 
                                VALUES (@Mat, 'SISTEMA', 1, GETDATE(), @Mot)`);
                }
            }
            await transaction.commit();
            return { totalReportados: listaMatriculas.length, nombreCulto };
        } catch (e) {
            await transaction.rollback();
            throw e;
        }
    }
}