import { Router } from 'express';
import { DormitorioRepositorySql } from '../../repositories/DormitorioRepositorySql.js';

const router = Router();
const repo = new DormitorioRepositorySql();

router.get('/', async (req, res) => {
    try {
        const data = await repo.listarDormitorios();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/pasillos', async (req, res) => {
    try {
        const data = await repo.listarPasillos();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/cuartos', async (req, res) => {
    const { idPasillo } = req.query;
    if (!idPasillo) return res.status(400).json({ success: false, message: 'Falta idPasillo' });
    try {
        const data = await repo.listarCuartosPorPasillo(idPasillo);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/ocupacion', async (req, res) => {
    try {
        const data = await repo.obtenerMapaOcupacion();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;