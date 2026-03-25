import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class EstudianteRepositorySql {
    async listarTodos() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT e.Matricula, e.NombreCompleto, e.Carrera, e.IdCuarto, c.NumeroCuarto
            FROM dormi.Estudiantes e
            INNER JOIN dormi.Cuartos c ON e.IdCuarto = c.IdCuarto
        `);
        return result.recordset;
    }

    async listarParaAsignacion() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT E.Matricula, E.NombreCompleto, E.IdCuarto, C.NumeroCuarto AS CuartoActual
            FROM dormi.Estudiantes E
            LEFT JOIN dormi.Cuartos C ON E.IdCuarto = C.IdCuarto
            ORDER BY E.NombreCompleto ASC
        `);
        return result.recordset;
    }

    async buscarPorMatricula(matricula) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('Matricula', sql.VarChar(10), matricula)
            .query(`
                SELECT e.Matricula, e.NombreCompleto, e.Carrera, e.IdCuarto, c.NumeroCuarto
                FROM dormi.Estudiantes e
                LEFT JOIN dormi.Cuartos c ON e.IdCuarto = c.IdCuarto
                WHERE e.Matricula = @Matricula
            `);
        return result.recordset[0];
    }

    async asignarCuarto(datos) {
        const pool = await getConnection();
        await pool.request()
            .input('Matricula', sql.VarChar(10), datos.matricula)
            .input('IdDormitorio', sql.Int, datos.idDormitorio)
            .input('IdPasillo', sql.Int, datos.idPasillo)
            .input('IdCuarto', sql.Int, datos.idCuarto)
            .query(`
                UPDATE dormi.Estudiantes
                SET IdDormitorio = @IdDormitorio, IdPasillo = @IdPasillo, IdCuarto = @IdCuarto
                WHERE Matricula = @Matricula
            `);
    }

    async obtenerFotoBinaria(matricula) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('Matricula', sql.VarChar(20), matricula)
            .query(`
                SELECT TOP 1 documentoDigital 
                FROM [IDS-APP].[dbo].[controlEscolar_DocumentosAlumno] 
                WHERE alu1Matricula = @Matricula AND claveDocumento = 'FOTO' AND documentoDigital IS NOT NULL
            `);
        return result.recordset[0]?.documentoDigital;
    }

    async actualizarBasico(matricula, datos) {
        const pool = await getConnection();
        await pool.request()
            .input('Matricula', sql.VarChar(10), matricula)
            .input('Nombre', sql.VarChar(100), datos.nombreCompleto)
            .input('Carrera', sql.VarChar(100), datos.carrera)
            .input('IdCuarto', sql.Int, datos.idCuarto)
            .query(`
                UPDATE dormi.Estudiantes
                SET NombreCompleto = @Nombre, Carrera = @Carrera, IdCuarto = @IdCuarto
                WHERE Matricula = @Matricula
            `);
    }
}