import admin from 'firebase-admin';
import { getConnection } from '../db.js';
import sql from 'mssql';

// Leer variable de entorno
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON no está definida.');
}

// Parsear JSON desde variable de entorno
const serviceAccount = JSON.parse(serviceAccountJson);

// Corregir saltos de línea del private_key
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// Inicializar Firebase solo una vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase Admin inicializado correctamente usando variable de entorno");
}

// Función reutilizable para enviar notificaciones
export const enviarNotificacion = async (matricula, titulo, mensaje) => {
  try {
    const pool = await getConnection();

    // 1️⃣ Obtener token FCM desde la tabla Usuarios del esquema DORMI
    const result = await pool.request()
      .input('Matricula', sql.VarChar, matricula)
      .query('SELECT FCMToken FROM Usuarios WHERE UsuarioID = @Matricula');

    const token = result.recordset[0]?.FCMToken;

    if (!token) {
      console.log(`El usuario ${matricula} no tiene token en Usuarios.`);
      return;
    }

    // 2 Construir y enviar el mensaje
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
    console.log(`Notificación enviada con éxito a: ${matricula}`);

  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
};