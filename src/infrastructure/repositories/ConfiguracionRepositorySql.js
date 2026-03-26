import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class ConfiguracionRepositorySql {
    async procesarCierreSemestre(nombreNuevoSemestre) {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();

            // 1. Cerrar el semestre actual (Activo = 1)
            await new sql.Request(transaction)
                .query("UPDATE dormi.Semestres SET Activo = 0, FechaFin = GETDATE() WHERE Activo = 1");

            // 2. Crear el NUEVO semestre
            await new sql.Request(transaction)
                .input('Nombre', sql.VarChar, nombreNuevoSemestre)
                .query("INSERT INTO dormi.Semestres (Nombre, FechaInicio, Activo) VALUES (@Nombre, GETDATE(), 1)");

            // 3. VACIAR LOS CUARTOS de todos los estudiantes
            await new sql.Request(transaction)
                .query(`
                    UPDATE dormi.Estudiantes 
                    SET IdCuarto = NULL, IdPasillo = NULL, IdDormitorio = NULL 
                `);

            await transaction.commit();
            return true;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
}