import { Router } from 'express';
import { AmonestacionRepositorySql } from '../../repositories/AmonestacionRepositorySql.js';
import { RegistrarAmonestacion } from '../../../application/usescases/RegistrarAmonestacion.js';
import { enviarNotificacion } from '../../../services/notification.service.js';

const router = Router();
const repo = new AmonestacionRepositorySql();
const registrarUC = new RegistrarAmonestacion(repo, { enviarNotificacion });

router.post('/registrar', async (req, res) => {
    try {
        await registrarUC.ejecutar(req.body);
        res.json({ success: true, message: 'Amonestación registrada' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const data = await repo.listarTodas();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/estudiante/:matricula', async (req, res) => {
    try {
        const data = await repo.listarPorEstudiante(req.params.matricula);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/niveles', async (req, res) => {
    try {
        const data = await repo.listarNiveles();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;