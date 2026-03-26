import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class UsuarioAdminRepositorySql {
    async listarMonitores() {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT U.UsuarioID, E.NombreCompleto
            FROM dormi.Usuarios U
            INNER JOIN dormi.Estudiantes E ON U.UsuarioID = E.Matricula
            WHERE U.IdRol = 2
            ORDER BY E.NombreCompleto ASC; 
        `);
        return result.recordset;
    }

    async obtenerRolActual(usuarioID) {
        const pool = await getConnection();
        const res = await pool.request()
            .input('Id', sql.VarChar(10), usuarioID)
            .query('SELECT IdRol FROM dormi.Usuarios WHERE UsuarioID = @Id');
        return res.recordset[0]?.IdRol;
    }

    async actualizarRol(usuarioID, nuevoRol) {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Cambiar Rol
            await new sql.Request(transaction)
                .input('Id', sql.VarChar(10), usuarioID)
                .input('Rol', sql.Int, nuevoRol)
                .query('UPDATE dormi.Usuarios SET IdRol = @Rol WHERE UsuarioID = @Id');

            // 2. Si vuelve a ser estudiante (3), limpiamos asignaciones de privilegio
            if (nuevoRol === 3) {
                await new sql.Request(transaction)
                    .input('Id', sql.VarChar(10), usuarioID)
                    .query('UPDATE dormi.Estudiantes SET IdPasillo = NULL, IdDormitorio = NULL WHERE Matricula = @Id');
            }

            await transaction.commit();
            return true;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
}