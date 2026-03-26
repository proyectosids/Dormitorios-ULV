import { Router } from 'express';
import { AsistenciaRepositorySql } from '../../repositories/AsistenciaRepositorySql.js';
import { ReportarInasistenciaMasiva } from '../../../application/usecases/ReportarInasistenciaMasiva.js';
import { enviarNotificacion } from '../../../services/notification.service.js';

const router = Router();
const repo = new AsistenciaRepositorySql();
const reportarUC = new ReportarInasistenciaMasiva(repo, { enviarNotificacion });

router.post("/registrar", async (req, res) => {
    try {
        let { idTipoCulto, nombreTipoCulto } = req.body;
        if (!idTipoCulto && nombreTipoCulto) {
            idTipoCulto = await repo.buscarIdTipoCultoPorNombre(nombreTipoCulto);
        }
        await repo.registrar({ ...req.body, idTipoCulto });
        res.json({ success: true, message: "Asistencia registrada ✅" });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get("/culto", async (req, res) => {
    const data = await repo.obtenerAsistenciasPorCulto(req.query.idTipoCulto, req.query.fecha || new Date());
    res.json({ success: true, data });
});

router.get("/faltantes", async (req, res) => {
    const data = await repo.obtenerFaltantes(req.query.idTipoCulto, req.query.fecha || new Date());
    res.json({ success: true, data });
});

router.post("/reportar-faltantes", async (req, res) => {
    try {
        const resultado = await reportarUC.ejecutar(req.body);
        res.json({ success: true, message: `Reportes generados: ${resultado.totalReportados}` });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;