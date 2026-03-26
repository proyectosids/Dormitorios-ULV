import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class AmonestacionRepositorySql {
    async registrar(amonestacion) {
        const pool = await getConnection();
        await pool.request()
            .input('Matricula', sql.VarChar(10), amonestacion.matriculaEstudiante)
            .input('Preceptor', sql.VarChar(10), amonestacion.clavePreceptor)
            .input('IdNivel', sql.Int, amonestacion.idNivel)
            .input('Motivo', sql.VarChar(200), amonestacion.motivo)
            .input('Fecha', sql.Date, amonestacion.fecha)
            .query(`
                INSERT INTO dormi.Amonestaciones (MatriculaEstudiante, ClavePreceptor, IdNivel, Motivo, Fecha)
                VALUES (@Matricula, @Preceptor, @IdNivel, @Motivo, @Fecha)
            `);
    }

    async listarTodas() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT A.*, E.NombreCompleto AS Estudiante, P.NombreCompleto AS Preceptor, N.Nombre AS Nivel
            FROM dormi.Amonestaciones A
            INNER JOIN dormi.Estudiantes E ON A.MatriculaEstudiante = E.Matricula
            INNER JOIN dormi.Preceptores P ON A.ClavePreceptor = P.ClaveEmpleado
            INNER JOIN dormi.Cat_NivelAmonestacion N ON A.IdNivel = N.IdNivel
            ORDER BY A.Fecha DESC
        `);
        return result.recordset;
    }

    async listarPorEstudiante(matricula) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('Matricula', sql.VarChar(10), matricula)
            .query(`
                SELECT A.*, P.NombreCompleto AS Preceptor, N.Nombre AS Nivel
                FROM dormi.Amonestaciones A
                INNER JOIN dormi.Preceptores P ON A.ClavePreceptor = P.ClaveEmpleado
                INNER JOIN dormi.Cat_NivelAmonestacion N ON A.IdNivel = N.IdNivel
                WHERE A.MatriculaEstudiante = @Matricula
                ORDER BY A.Fecha DESC 
            `);
        return result.recordset;
    }

    async listarNiveles() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT IdNivel, Nombre FROM dormi.Cat_NivelAmonestacion ORDER BY IdNivel ASC 
        `);
        return result.recordset;
    }
}