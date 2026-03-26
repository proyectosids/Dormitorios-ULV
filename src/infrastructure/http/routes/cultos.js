import { Router } from 'express';
import { CultoRepositorySql } from '../../repositories/CultoRepositorySql.js';

const router = Router();
const repo = new CultoRepositorySql();

router.get('/tipos', async (req, res) => {
    try {
        const data = await repo.listarTipos();
        res.json({ success: true, data });
    } catch (e) {
        console.error('Error en GET /api/cultos/tipos:', e);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener los tipos de culto disponibles.', 
            error: e.message 
        });
    }
});

export default router;