import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// Listar todos los monitores del esquema dormi
router.get('/monitores', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT 
          U.UsuarioID, 
          E.NombreCompleto
        FROM dormi.Usuarios U
        INNER JOIN dormi.Estudiantes E ON U.UsuarioID = E.Matricula
        WHERE U.IdRol = 2 -- IdRol 2 = Monitor
        ORDER BY E.NombreCompleto ASC; 
      `);
    
    res.json({ success: true, data: result.recordset });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener la lista de monitores.', error: error.message });
  }
});

// Actualizar rol de usuario (Estudiante <-> Monitor) en esquema dormi
router.put('/:usuarioID/rol', async (req, res) => {
  const { usuarioID } = req.params;
  const { nuevoRol } = req.body; 

  if (!nuevoRol || (nuevoRol !== 2 && nuevoRol !== 3)) {
    return res.status(400).json({ success: false, message: 'El nuevoRol debe ser 2 (Monitor) o 3 (Estudiante).' });
  }

  try {
    const pool = await getConnection();

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

    const result = await pool.request()
      .input('UsuarioID', sql.VarChar(10), usuarioID)
      .input('NuevoRol', sql.Int, nuevoRol)
      .query(`
        UPDATE dormi.Usuarios
        SET IdRol = @NuevoRol
        WHERE UsuarioID = @UsuarioID;
      `);

    if (result.rowsAffected[0] > 0) {
       // Si el usuario vuelve a ser estudiante normal, limpiamos sus privilegios de pasillo
       if (nuevoRol === 3) {
           await pool.request()
             .input('UsuarioID', sql.VarChar(10), usuarioID)
             .query(`
                UPDATE dormi.Estudiantes 
                SET IdPasillo = NULL, IdDormitorio = NULL 
                WHERE Matricula = @UsuarioID;
             `);
       }

      res.json({ success: true, message: `Rol del usuario actualizado correctamente.` });
    } else {
      res.status(404).json({ success: false, message: 'No se encontró el usuario para actualizar.' });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor al actualizar el rol.', error: error.message });
  }
});

export default router;