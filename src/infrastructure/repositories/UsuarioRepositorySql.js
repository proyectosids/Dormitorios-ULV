import { getConnection } from '../db/db.js';
import sql from 'mssql';

export class UsuarioRepositorySql {
    async buscarPorId(usuarioID) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('UsuarioID', sql.VarChar(20), usuarioID)
            .query(`
                SELECT U.UsuarioID, U.Password, U.IdRol,
                       COALESCE(E.NombreCompleto, P.NombreCompleto) AS NombreCompleto,
                       COALESCE(E.Correo, P.Correo) AS Correo,
                       E.Carrera, ISNULL(E.IdCuarto, 0) AS IdCuarto,
                       ISNULL(E.IdPasillo, 0) AS IdPasillo,
                       ISNULL(COALESCE(E.IdDormitorio, P.IdDormitorio), 0) AS IdDormitorio
                FROM dormi.Usuarios U
                LEFT JOIN dormi.Estudiantes E ON U.UsuarioID = E.Matricula 
                LEFT JOIN dormi.Preceptores P ON U.UsuarioID = P.ClaveEmpleado
                WHERE U.UsuarioID = @UsuarioID
            `);
        return result.recordset[0];
    }

    async registrarCompleto(datos) {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request()
                .input('UsuarioID', sql.VarChar(20), datos.usuarioID)
                .input('Password', sql.VarChar(255), datos.password)
                .input('IdRol', sql.Int, datos.idRol)
                .query(`INSERT INTO dormi.Usuarios (UsuarioID, Password, IdRol, FechaRegistro) VALUES (@UsuarioID, @Password, @IdRol, GETDATE())`);

            if (datos.idRol === 3) {
                await transaction.request()
                    .input('Matricula', sql.VarChar(20), datos.usuarioID)
                    .input('Nombre', sql.VarChar(150), datos.nombreCompleto)
                    .input('Carrera', sql.VarChar(100), datos.carrera)
                    .input('Correo', sql.VarChar(100), datos.correo)
                    .query(`INSERT INTO dormi.Estudiantes (Matricula, NombreCompleto, Carrera, Correo) VALUES (@Matricula, @Nombre, @Carrera, @Correo)`);
            } else if (datos.idRol === 1) {
                await transaction.request()
                    .input('Clave', sql.VarChar(20), datos.usuarioID)
                    .input('Nombre', sql.VarChar(150), datos.nombreCompleto)
                    .input('Correo', sql.VarChar(100), datos.correo)
                    .query(`INSERT INTO dormi.Preceptores (ClaveEmpleado, NombreCompleto, Correo) VALUES (@Clave, @Nombre, @Correo)`);
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    async actualizarPasswordPorCorreo(correo, nuevaPasswordHashed) {
        const pool = await getConnection();
        const userSearch = await pool.request()
            .input('Correo', sql.VarChar(100), correo)
            .query(`SELECT Matricula AS UsuarioID FROM dormi.Estudiantes WHERE Correo = @Correo 
                    UNION SELECT ClaveEmpleado AS UsuarioID FROM dormi.Preceptores WHERE Correo = @Correo`);
        
        if (userSearch.recordset.length === 0) return false;
        
        const usuarioID = userSearch.recordset[0].UsuarioID;
        await pool.request()
            .input('UsuarioID', sql.VarChar(20), usuarioID)
            .input('Password', sql.VarChar(255), nuevaPasswordHashed)
            .query(`UPDATE dormi.Usuarios SET Password = @Password WHERE UsuarioID = @UsuarioID`);
        return true;
    }

    async actualizarTokenFCM(usuarioID, token) {
        const pool = await getConnection();
        await pool.request()
            .input('UsuarioID', sql.VarChar, usuarioID)
            .input('Token', sql.VarChar, token)
            .query('UPDATE dormi.Usuarios SET FCMToken = @Token WHERE UsuarioID = @UsuarioID');
    }
}