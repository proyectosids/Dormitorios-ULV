import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// ==========================================
// 1. OBTENER LISTA DE MONITORES
// ==========================================
router.get('/monitores', async (req, res) => {
  console.log('[API Usuarios] GET /monitores');
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT 
          U.UsuarioID, -- Matricula del monitor
          E.NombreCompleto
        FROM dormi.Usuarios U
        INNER JOIN dormi.Estudiantes E ON U.UsuarioID = E.Matricula
        WHERE U.IdRol = 2 -- IdRol 2 = Monitor
        ORDER BY E.NombreCompleto ASC; 
      `);
    
    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('[API Usuarios] Error en GET /monitores:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la lista de monitores.', error: error.message });
  }
});

// ==========================================
// 2. CAMBIAR ROL (Promover a Monitor / Degradar a Estudiante)
// ==========================================
router.put('/:usuarioID/rol', async (req, res) => {
  const { usuarioID } = req.params;
  const { nuevoRol } = req.body; 
  console.log(`[API Usuarios] PUT /${usuarioID}/rol - Nuevo Rol: ${nuevoRol}`);

  // Validación básica
  if (!nuevoRol || (nuevoRol !== 2 && nuevoRol !== 3)) {
    return res.status(400).json({ success: false, message: 'El nuevoRol es requerido y debe ser 2 (Monitor) o 3 (Estudiante).' });
  }
  if (!usuarioID) {
      return res.status(400).json({ success: false, message: 'Falta el usuarioID en la URL.' });
  }

  try {
    const pool = await getConnection();

    // Verificar usuario en esquema dormi
    const userCheck = await pool.request()
        .input('UsuarioID', sql.VarChar(10), usuarioID)
        .query('SELECT IdRol FROM dormi.Usuarios WHERE UsuarioID = @UsuarioID');

    if (userCheck.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'El usuario especificado no existe.' });
    }

    if (userCheck.recordset[0].IdRol === nuevoRol) {
        const rolNombre = nuevoRol === 2 ? 'Monitor' : 'Estudiante';
         return res.status(400).json({ success: false, message: `El usuario ya tiene el rol de ${rolNombre}.` });
    }

    // Actualizar Rol en dormi.Usuarios
    const result = await pool.request()
      .input('UsuarioID', sql.VarChar(10), usuarioID)
      .input('NuevoRol', sql.Int, nuevoRol)
      .query(`
        UPDATE dormi.Usuarios
        SET IdRol = @NuevoRol
        WHERE UsuarioID = @UsuarioID;
      `);

    if (result.rowsAffected[0] > 0) {
       // Si se degrada a estudiante (Rol 3), limpiamos asignaciones especiales de monitor si las tuviera
       if (nuevoRol === 3) {
           await pool.request()
             .input('UsuarioID', sql.VarChar(10), usuarioID)
             .query(`
                UPDATE dormi.Estudiantes 
                SET IdPasillo = NULL, IdDormitorio = NULL 
                WHERE Matricula = @UsuarioID;
             `);
           console.log(`[API Usuarios] PUT /${usuarioID}/rol - Se limpiaron campos de monitor en Estudiantes.`);
       }

      res.json({ success: true, message: `Rol del usuario ${usuarioID} actualizado correctamente a ${nuevoRol === 2 ? 'Monitor' : 'Estudiante'}.` });
    } else {
      res.status(404).json({ success: false, message: 'No se encontró el usuario para actualizar.' });
    }

  } catch (error) {
    console.error(`[API Usuarios] Error en PUT /${usuarioID}/rol:`, error);
    res.status(500).json({ success: false, message: 'Error en el servidor al actualizar el rol.', error: error.message });
  }
});

export default router;