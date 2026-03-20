import cron from 'node-cron';
import { v2 as cloudinary } from 'cloudinary';
import { getConnection } from '../db.js';
import sql from 'mssql';

// Configuración de la tarea: Se ejecuta todos los días a las 3:00 AM
cron.schedule('0 3 * * *', async () => {
    console.log('--- 🤖 SISTEMA: Iniciando limpieza de fotos viejas (7 días) ---');
    
    try {
        const pool = await getConnection();
        
        // 1. Buscar registros con fotos de más de 7 días que aún no han sido borradas
        const result = await pool.request().query(`
            SELECT IdLimpieza, PublicIdFoto 
            FROM dormi.Limpieza 
            WHERE Fecha < DATEADD(day, -7, GETDATE()) 
              AND PublicIdFoto IS NOT NULL
        `);

        if (result.recordset.length === 0) {
            console.log('✅ No hay fotos viejas para eliminar hoy.');
            return;
        }

        for (const registro of result.recordset) {
            // 2. Borrar de Cloudinary usando el PublicId
            await cloudinary.uploader.destroy(registro.PublicIdFoto);
            
            // 3. Limpiar los campos en SQL para marcar que ya se borró
            await pool.request()
                .input('Id', sql.Int, registro.IdLimpieza)
                .query(`
                    UPDATE dormi.Limpieza 
                    SET UrlFoto = NULL, PublicIdFoto = NULL 
                    WHERE IdLimpieza = @Id
                `);
            
            console.log(`🗑️ Foto del registro ${registro.IdLimpieza} eliminada por SISTEMA.`);
        }

    } catch (error) {
        console.error('❌ Error en el proceso de borrado del SISTEMA:', error);
    }
});