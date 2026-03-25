import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class DormitorioRepositorySql {
    async listarDormitorios() {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM dormi.Dormitorios');
        return result.recordset;
    }

    async listarPasillos() {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM dormi.Pasillos');
        return result.recordset;
    }

    async listarCuartosPorPasillo(idPasillo) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('IdPasillo', sql.Int, idPasillo)
            .query('SELECT * FROM dormi.Cuartos WHERE IdPasillo = @IdPasillo');
        return result.recordset;
    }

    async obtenerMapaOcupacion() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                P.NombrePasillo, C.IdCuarto, C.NumeroCuarto, C.Capacidad,
                E.NombreCompleto AS Estudiante
            FROM dormi.Pasillos P
            INNER JOIN dormi.Cuartos C ON P.IdPasillo = C.IdPasillo
            LEFT JOIN dormi.Estudiantes E ON C.IdCuarto = E.IdCuarto
            ORDER BY P.NombrePasillo, C.NumeroCuarto
        `);
        return result.recordset;
    }
}