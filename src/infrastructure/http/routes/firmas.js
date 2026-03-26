import { Router } from 'express';
import { FirmaRepositorySql } from '../../repositories/FirmaRepositorySql.js';
import { RegistrarFirmaDigital } from '../../../application/usescases/RegistrarFirmaDigital.js';

const router = Router();
const repo = new FirmaRepositorySql();
const registrarFirmaUC = new RegistrarFirmaDigital(repo);

router.post('/guardar', async (req, res) => {
    try {
        await registrarFirmaUC.ejecutar(req.body);
        res.json({ success: true, message: `Firma guardada correctamente` });
    } catch (e) {
        console.error("❌ ERROR EN FIRMAS:", e.message);
        res.status(400).json({ success: false, message: e.message });
    }
});

export default router;