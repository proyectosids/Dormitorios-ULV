import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class ReporteRepositorySql {
    constructor() {
        this.reportanteNombreQuery = `
            COALESCE(
                (SELECT NombreCompleto FROM dormi.Estudiantes WHERE Matricula = R.ReportadoPor AND R.TipoUsuarioReportante = 'Monitor'),
                (SELECT NombreCompleto FROM dormi.Preceptores WHERE ClaveEmpleado = R.ReportadoPor AND R.TipoUsuarioReportante = 'Preceptor'),
                'Sistema' 
            ) AS ReportadoPorNombre`;
    }

    async listarPaginados(page, limit, search) {
        const pool = await getConnection();
        const offset = (page - 1) * limit;
        let whereClause = search ? `WHERE R.MatriculaReportado LIKE @Search OR E.NombreCompleto LIKE @Search` : '';

        const request = pool.request();
        if (search) request.input('Search', sql.VarChar, `%${search}%`);

        const result = await request.query(`
            SELECT R.*, E.NombreCompleto AS NombreEstudiante, ${this.reportanteNombreQuery}
            FROM dormi.Reportes R
            INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula
            ${whereClause}
            ORDER BY R.FechaReporte DESC
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `);

        const total = await request.query(`SELECT COUNT(*) as total FROM dormi.Reportes R INNER JOIN dormi.Estudiantes E ON R.MatriculaReportado = E.Matricula ${whereClause}`);
        
        return { data: result.recordset, total: total.recordset[0].total };
    }

    async crearReporteConAmonestacion(reporte) {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Insertar Reporte
            await new sql.Request(transaction)
                .input('Matricula', sql.VarChar(10), reporte.matriculaReportado)
                .input('ReportadoPor', sql.VarChar(10), reporte.reportadoPor)
                .input('Tipo', sql.VarChar(15), reporte.tipoUsuarioReportante)
                .input('Motivo', sql.Text, reporte.motivo)
                .input('Estado', sql.VarChar(20), reporte.estado)
                .input('IdTipo', sql.Int, reporte.idTipoReporte)
                .query(`INSERT INTO dormi.Reportes (MatriculaReportado, ReportadoPor, TipoUsuarioReportante, Motivo, Estado, IdTipoReporte) 
                        VALUES (@Matricula, @ReportadoPor, @Tipo, @Motivo, @Estado, @IdTipo)`);

            // 2. Verificar acumulación
            const count = await new sql.Request(transaction)
                .input('Matricula', sql.VarChar(10), reporte.matriculaReportado)
                .input('IdTipo', sql.Int, reporte.idTipoReporte)
                .query(`SELECT COUNT(*) as Total FROM dormi.Reportes WHERE MatriculaReportado = @Matricula AND IdTipoReporte = @IdTipo 
                        AND MONTH(FechaReporte) = MONTH(GETDATE()) AND YEAR(FechaReporte) = YEAR(GETDATE())`);

            let amonestacionGenerada = false;
            if (count.recordset[0].Total % 3 === 0) {
                await new sql.Request(transaction)
                    .input('Matricula', sql.VarChar(10), reporte.matriculaReportado)
                    .query(`INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Motivo, Fecha) 
                            VALUES (@Matricula, 'SISTEMA', 1, 'Acumulación de 3 reportes (Automática)', GETDATE())`);
                amonestacionGenerada = true;
            }

            await transaction.commit();
            return { amonestacionGenerada };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    async cambiarEstado(idReporte, nuevoEstado, preceptorId = null) {
        const pool = await getConnection();
        const res = await pool.request()
            .input('Id', sql.Int, idReporte)
            .input('Estado', sql.VarChar(20), nuevoEstado)
            .input('Preceptor', sql.VarChar(10), preceptorId)
            .query(`UPDATE dormi.Reportes SET Estado = @Estado, ClavePreceptorAprobador = @Preceptor, FechaAprobacion = GETDATE() 
                    OUTPUT INSERTED.MatriculaReportado, INSERTED.Motivo
                    WHERE IdReporte = @Id`);
        return res.recordset[0];
    }
}