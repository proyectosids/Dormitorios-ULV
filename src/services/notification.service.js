import admin from 'firebase-admin';
import { getConnection } from '../db.js';
import sql from 'mssql';
import { readFile } from 'fs/promises';

// 🔥 Cargar el archivo JSON directamente
const serviceAccount = JSON.parse(
  await readFile(new URL('../firebase-service-account.json', import.meta.url))
);

// 🔥 Inicializar Firebase solo una vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("🔥 Firebase Admin inicializado correctamente para producción");
}

// 📩 Función reutilizable para enviar notificaciones
export const enviarNotificacion = async (matricula, titulo, mensaje) => {
  try {
    const pool = await getConnection();

    // 1️⃣ Obtener token FCM desde la tabla Usuarios del esquema DORMI
    const result = await pool.request()
      .input('Matricula', sql.VarChar, matricula)
      .query('SELECT FCMToken FROM dormi.Usuarios WHERE UsuarioID = @Matricula');

    const token = result.recordset[0]?.FCMToken;

    if (!token) {
      console.log(`⚠️ El usuario ${matricula} no tiene token en dormi.Usuarios.`);
      return;
    }

    // 2️⃣ Construir y enviar el mensaje
    const message = {
      token: token,
      notification: {
        title: titulo,
        body: mensaje,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        tipo: 'INFO',
      },
      android: {
        notification: {
          channel_id: 'high_importance_channel',
          priority: 'high',
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`✅ Notificación enviada con éxito a: ${matricula}`);

  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
};