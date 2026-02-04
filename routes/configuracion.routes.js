import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// RUTA PARA CERRAR SEMESTRE Y VACIAR CUARTOS
router.post('/cerrar-semestre', async (req, res) => {
    const { nombreNuevoSemestre } = req.body; // El preceptor envía "2026-B"

    if (!nombreNuevoSemestre) {
        return res.status(400).json({ message: 'El nombre del nuevo semestre es obligatorio' });
    }

    try {
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        
        // Iniciamos la operación segura
        await transaction.begin();

        try {
            // 1. Cerrar el semestre actual (El que tiene Activo = 1)
            await transaction.request()
                .query("UPDATE Semestres SET Activo = 0, FechaFin = GETDATE() WHERE Activo = 1");

            // 2. Crear el NUEVO semestre
            await transaction.request()
                .input('Nombre', sql.VarChar, nombreNuevoSemestre)
                .query("INSERT INTO Semestres (Nombre, FechaInicio, Activo) VALUES (@Nombre, GETDATE(), 1)");

            // 3. VACIAR LOS CUARTOS (Aquí ocurre la magia)
            // Ponemos en NULL los campos de ubicación de TODOS los estudiantes
            await transaction.request()
                .query(`
                    UPDATE Estudiantes 
                    SET IdCuarto = NULL, IdPasillo = NULL, IdDormitorio = NULL 
                `);

            // Si todo salió bien, guardamos los cambios
            await transaction.commit();
            
            console.log(`✅ Semestre cerrado. Iniciado: ${nombreNuevoSemestre}`);
            res.json({ success: true, message: 'Semestre cerrado y cuartos vaciados correctamente.' });

        } catch (err) {
            // Si algo falló, deshacemos todo (nadie pierde su cuarto)
            await transaction.rollback();
            console.error("Error en transacción:", err);
            res.status(500).send('Error al procesar el cierre de semestre');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Error de servidor');
    }
});

export default router;