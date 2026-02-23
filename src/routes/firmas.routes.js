import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

router.post('/guardar', async (req, res) => {
    const { idDocumento, tipo, firmaBase64 } = req.body;

    console.log("=== NUEVA PETICIÓN DE FIRMA (DORMI) ===");
    console.log("ID:", idDocumento);
    console.log("Tipo:", tipo);

    if (!idDocumento || !firmaBase64 || !tipo) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (id, tipo o firma)' });
    }

    try {
        const pool = await getConnection();
        let query = "";

        // Determinamos qué tabla del esquema dormi actualizar
        if (tipo === 'REPORTE') {
            query = `
                UPDATE dormi.Reportes 
                SET FirmaEstudiante = @Firma, FechaFirma = GETDATE() 
                WHERE IdReporte = @Id
            `;
        } else if (tipo === 'AMONESTACION') {
            query = `
                UPDATE dormi.Amonestaciones 
                SET FirmaEstudiante = @Firma, FechaFirma = GETDATE() 
                WHERE IdAmonestacion = @Id
            `;
        } else {
            return res.status(400).json({ success: false, message: 'Tipo de documento no válido' });
        }

        const result = await pool.request()
            .input('Firma', sql.VarChar(sql.MAX), firmaBase64)
            .input('Id', sql.Int, idDocumento)
            .query(query);

        if (result.rowsAffected[0] > 0) {
            console.log(`✅ Firma de ${tipo} guardada correctamente en producción`);
            res.json({ success: true, message: `Firma de ${tipo} guardada correctamente` });
        } else {
            res.status(404).json({ success: false, message: 'No se encontró el registro para actualizar en el esquema dormi' });
        }

    } catch (error) {
        console.error("❌ ERROR EN SQL FIRMAS:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;