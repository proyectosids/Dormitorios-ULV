import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// RUTA PARA CERRAR SEMESTRE Y VACIAR CUARTOS (ESQUEMA DORMI)
router.post('/cerrar-semestre', async (req, res) => {
    const { nombreNuevoSemestre } = req.body; // El preceptor envía por ejemplo "2026-B"

    if (!nombreNuevoSemestre) {
        return res.status(400).json({ message: 'El nombre del nuevo semestre es obligatorio' });
    }

    try {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        
        // Iniciamos la operación segura
        await transaction.begin();

        try {
            // 1. Cerrar el semestre actual (El que tiene Activo = 1) en el esquema dormi
            await transaction.request()
                .query("UPDATE dormi.Semestres SET Activo = 0, FechaFin = GETDATE() WHERE Activo = 1");

            // 2. Crear el NUEVO semestre en el esquema dormi
            await transaction.request()
                .input('Nombre', sql.VarChar, nombreNuevoSemestre)
                .query("INSERT INTO dormi.Semestres (Nombre, FechaInicio, Activo) VALUES (@Nombre, GETDATE(), 1)");

            // 3. VACIAR LOS CUARTOS
            // Ponemos en NULL los campos de ubicación de TODOS los estudiantes en dormi.Estudiantes
            await transaction.request()
                .query(`
                    UPDATE dormi.Estudiantes 
                    SET IdCuarto = NULL, IdPasillo = NULL, IdDormitorio = NULL 
                `);

            // Si todo salió bien, guardamos los cambios definitivamente
            await transaction.commit();
            
            console.log(`✅ Semestre cerrado en producción. Iniciado: ${nombreNuevoSemestre}`);
            res.json({ success: true, message: 'Semestre cerrado y cuartos vaciados correctamente en el esquema dormi.' });

        } catch (err) {
            // Si algo falló, deshacemos todo para no dejar datos inconsistentes
            await transaction.rollback();
            console.error("Error en transacción de cierre:", err);
            res.status(500).send('Error al procesar el cierre de semestre en el servidor');
        }

    } catch (error) {
        console.error("Error de servidor en ruta semestre:", error);
        res.status(500).send('Error de servidor');
    }
});

export default router;