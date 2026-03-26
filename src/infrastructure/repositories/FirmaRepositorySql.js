import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class FirmaRepositorySql {
    async guardarFirma(id, tipo, firmaBase64) {
        const pool = await getConnection();
        
        // Mapeo dinámico de tablas según el tipo
        const tabla = tipo === 'REPORTE' ? 'dormi.Reportes' : 'dormi.Amonestaciones';
        const pk = tipo === 'REPORTE' ? 'IdReporte' : 'IdAmonestacion';

        const query = `
            UPDATE ${tabla} 
            SET FirmaEstudiante = @Firma, FechaFirma = GETDATE() 
            WHERE ${pk} = @Id
        `;

        const result = await pool.request()
            .input('Firma', sql.VarChar(sql.MAX), firmaBase64)
            .input('Id', sql.Int, id)
            .query(query);

        return result.rowsAffected[0] > 0;
    }
}