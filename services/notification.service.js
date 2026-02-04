import admin from 'firebase-admin';
import { getConnection } from '../db.js';
import sql from 'mssql';

// 🛑 Validación clara
if (!process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 no está definida en el .env');
}

// 🔐 Convertimos Base64 → JSON
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8')
);

// 🔥 Inicializar Firebase solo una vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// 📩 Función reutilizable para enviar notificaciones
export const enviarNotificacion = async (matricula, titulo, mensaje) => {
  try {
    const pool = await getConnection();

    // 1️⃣ Obtener token FCM desde BD
    // CORRECCIÓN AQUÍ: Agregamos 'dormi.' antes de Usuarios
    const result = await pool.request()
      .input('Matricula', sql.VarChar, matricula)
      .query('SELECT FCMToken FROM dormi.Usuarios WHERE UsuarioID = @Matricula');

    const token = result.recordset[0]?.FCMToken;

    if (!token) {
      console.log(`⚠️ El usuario ${matricula} no tiene token registrado.`);
      return;
    }

    // 2️⃣ Enviar notificación
    await admin.messaging().send({
      token,
      notification: {
        title: titulo,
        body: mensaje,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        tipo: 'INFO',
      },
    });

    console.log(`✅ Notificación enviada a ${matricula}`);

  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
};