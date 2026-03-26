import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class CultoRepositorySql {
    async listarTipos() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                IdTipoCulto, 
                Nombre 
            FROM dormi.Cat_TipoCulto
            ORDER BY Nombre ASC 
        `);
        return result.recordset;
    }
}