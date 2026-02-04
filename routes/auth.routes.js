import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';
import axios from 'axios'; 
import bcrypt from 'bcryptjs';

const router = Router();

// ==========================================
// 1. LOGIN
// ==========================================
router.post('/login', async (req, res) => {
  const { usuarioID, password } = req.body;
  console.log(`[LOGIN] Usuario: ${usuarioID}`);

  try {
    const pool = await getConnection();
    
    // PROTECCIÓN CRÍTICA: ISNULL convierte los nulos del cierre de semestre en 0
    // SE ACTUALIZÓ PARA USAR EL ESQUEMA 'dormi'
    const result = await pool.request()
      .input('UsuarioID', sql.VarChar(20), usuarioID)
      .query(`
        SELECT 
          U.UsuarioID,
          U.Password,
          U.IdRol,
          COALESCE(E.NombreCompleto, P.NombreCompleto) AS NombreCompleto,
          COALESCE(E.Correo, P.Correo) AS Correo,
          E.Carrera,
          ISNULL(E.IdCuarto, 0) AS IdCuarto,
          ISNULL(E.IdPasillo, 0) AS IdPasillo,
          ISNULL(COALESCE(E.IdDormitorio, P.IdDormitorio), 0) AS IdDormitorio
        FROM dormi.Usuarios U
        LEFT JOIN dormi.Estudiantes E ON U.UsuarioID = E.Matricula 
        LEFT JOIN dormi.Preceptores P ON U.UsuarioID = P.ClaveEmpleado
        WHERE U.UsuarioID = @UsuarioID
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    const usuario = result.recordset[0];
    const isMatch = await bcrypt.compare(password, usuario.Password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }

    delete usuario.Password;
    res.json({ success: true, data: usuario });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

// ==========================================
// 2. CHECK ACCESS (Valida con API Externa)
// ==========================================
router.post('/check-access', async (req, res) => {
  const { usuarioID, idRol } = req.body;
  const apiUrl = `https://ulv-api.apps.isdapps.uk/api/datos/`;

  try {
    const response = await axios.get(`${apiUrl}${usuarioID}`);
    
    if (idRol === 3) { // Estudiante
      const studentData = response.data?.Data?.student?.[0];
      if (!studentData) return res.status(404).json({ success: false, message: 'Matrícula no encontrada.' });
      
      const residencia = (studentData.RESIDENCIA || "").toUpperCase().trim();
      if (residencia !== 'INTERNO') {
         return res.status(403).json({ success: false, message: `Eres ${residencia}. Solo INTERNOS pueden registrarse.` });
      }
      return res.json({ success: true, message: 'Acceso autorizado.' });
    }
    else if (idRol === 1) { // Preceptor
      const employeeData = response.data?.data?.employee?.[0];
      if (!employeeData) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });

      const depto = (employeeData.DEPARTAMENTO || "").toUpperCase();
      const validos = ['H.S.N.M', 'H.V.N.U', 'H.V.N.M']; 
      if (!validos.some(v => depto.includes(v))) {
         return res.status(403).json({ success: false, message: 'Departamento no autorizado.' });
      }
      return res.json({ success: true, message: 'Acceso autorizado.' });
    }
  } catch (error) {
    if (error.response && error.response.status === 404) return res.status(404).json({ success: false, message: 'ID no encontrado.' });
    res.status(500).json({ success: false, message: 'Error verificando API.' });
  }
});

// ==========================================
// 3. REGISTRO DE USUARIOS
// ==========================================
router.post('/register', async (req, res) => {
  const { usuarioID, password, idRol, nombreCompleto, carrera, correo } = req.body;
  try {
    const pool = await getConnection();
    
    // Verificar si ya existe en esquema dormi
    const checkUser = await pool.request()
      .input('UsuarioID', sql.VarChar(20), usuarioID)
      .query('SELECT UsuarioID FROM dormi.Usuarios WHERE UsuarioID = @UsuarioID');
    
    if (checkUser.recordset.length > 0) return res.status(400).json({ success: false, message: 'Usuario ya registrado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Insertar en tabla Usuarios (Base)
      await transaction.request()
        .input('UsuarioID', sql.VarChar(20), usuarioID)
        .input('Password', sql.VarChar(255), hashedPassword)
        .input('IdRol', sql.Int, idRol)
        .query(`INSERT INTO dormi.Usuarios (UsuarioID, Password, IdRol, FechaRegistro) VALUES (@UsuarioID, @Password, @IdRol, GETDATE())`);

      // 2. Insertar en tabla específica según Rol
      if (idRol === 3) { // Estudiante
        await transaction.request()
          .input('Matricula', sql.VarChar(20), usuarioID)
          .input('Nombre', sql.VarChar(150), nombreCompleto)
          .input('Carrera', sql.VarChar(100), carrera)
          .input('Correo', sql.VarChar(100), correo)
          .query(`
            IF NOT EXISTS (SELECT * FROM dormi.Estudiantes WHERE Matricula = @Matricula) 
            INSERT INTO dormi.Estudiantes (Matricula, NombreCompleto, Carrera, Correo) 
            VALUES (@Matricula, @Nombre, @Carrera, @Correo)
          `);
      } else if (idRol === 1) { // Preceptor
         await transaction.request()
           .input('Clave', sql.VarChar(20), usuarioID)
           .input('Nombre', sql.VarChar(150), nombreCompleto)
           .input('Correo', sql.VarChar(100), correo)
           .query(`
             IF NOT EXISTS (SELECT * FROM dormi.Preceptores WHERE ClaveEmpleado = @Clave) 
             INSERT INTO dormi.Preceptores (ClaveEmpleado, NombreCompleto, Correo) 
             VALUES (@Clave, @Nombre, @Correo)
           `);
      }
      
      await transaction.commit();
      res.json({ success: true, message: 'Registro exitoso.' });
    } catch (err) { 
        await transaction.rollback(); 
        throw err; 
    }
  } catch (error) { 
      res.status(500).json({ success: false, message: 'Error interno', error: error.message }); 
  }
});

// ==========================================
// 4. RESET PASSWORD (Depurado)
// ==========================================
router.post('/reset-password', async (req, res) => {
  const { correo, nuevaPassword } = req.body;
  console.log(`[RESET PASS] Correo: ${correo}`);

  if (!correo || !nuevaPassword) {
    return res.status(400).json({ success: false, message: 'Faltan datos.' });
  }

  try {
    const pool = await getConnection();
    // Buscamos usuario limpiando espacios en blanco del correo
    const userSearch = await pool.request()
      .input('Correo', sql.VarChar(100), correo)
      .query(`
        SELECT Matricula AS UsuarioID FROM dormi.Estudiantes WHERE LTRIM(RTRIM(Correo)) = @Correo
        UNION
        SELECT ClaveEmpleado AS UsuarioID FROM dormi.Preceptores WHERE LTRIM(RTRIM(Correo)) = @Correo
      `);

    if (userSearch.recordset.length === 0) {
      console.log('[RESET PASS] Correo no encontrado');
      return res.status(404).json({ success: false, message: 'Correo no registrado.' });
    }

    const usuarioID = userSearch.recordset[0].UsuarioID;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

    await pool.request()
      .input('UsuarioID', sql.VarChar(20), usuarioID)
      .input('Password', sql.VarChar(255), hashedPassword)
      .query(`UPDATE dormi.Usuarios SET Password = @Password WHERE UsuarioID = @UsuarioID`);

    console.log(`[RESET PASS] Contraseña actualizada para: ${usuarioID}`);
    res.json({ success: true, message: 'Contraseña actualizada.' });

  } catch (error) {
    console.error('[RESET ERROR]', error);
    res.status(500).json({ success: false, message: 'Error del servidor.', error: error.message });
  }
});

// ==========================================
// 5. UPDATE TOKEN (FCM)
// ==========================================
router.post('/update-token', async (req, res) => {
    const { usuarioID, token } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('UsuarioID', sql.VarChar, usuarioID)
            .input('Token', sql.VarChar, token)
            .query('UPDATE dormi.Usuarios SET FCMToken = @Token WHERE UsuarioID = @UsuarioID');
        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
});

export default router;