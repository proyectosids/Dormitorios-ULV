import { Router } from 'express';
import { ReporteRepositorySql } from '../../repositories/ReporteRepositorySql.js';
import { CrearReporte } from '../../../application/usescases/CrearReporte.js';
import { enviarNotificacion } from '../../../services/notification.service.js';

const router = Router();
const repo = new ReporteRepositorySql();
const crearUC = new CrearReporte(repo, { enviarNotificacion });

router.get('/', async (req, res) => {
    const { page, limit, search } = req.query;
    const result = await repo.listarPaginados(parseInt(page) || 1, parseInt(limit) || 20, search);
    res.json({ success: true, ...result });
});

router.post('/crear', async (req, res) => {
    try {
        await crearUC.ejecutar(req.body);
        res.status(201).json({ success: true, message: 'Reporte creado' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:idReporte/aprobar', async (req, res) => {
    const data = await repo.cambiarEstado(req.params.idReporte, 'Aprobado', req.body.preceptorId);
    if (data) enviarNotificacion(data.MatriculaReportado, "✅ Reporte Aprobado", `Tu reporte "${data.Motivo}" ha sido aprobado.`);
    res.json({ success: !!data });
});

export default router;