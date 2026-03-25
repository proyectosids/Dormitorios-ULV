import { Router } from 'express';
import { EstudianteRepositorySql } from '../../repositories/EstudianteRepositorySql.js';
import { ObtenerFotoEstudiante } from '../../../application/usescases/ObtenerFotoEstudiante.js';

const router = Router();
const repo = new EstudianteRepositorySql();
const fotoUC = new ObtenerFotoEstudiante(repo);

router.get('/', async (req, res) => {
    try {
        const data = await repo.listarTodos();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/para-asignacion', async (req, res) => {
    try {
        const data = await repo.listarParaAsignacion();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:matricula/foto', async (req, res) => {
    try {
        const buffer = await fotoUC.ejecutar(req.params.matricula);
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(buffer);
    } catch (e) { res.status(404).send(e.message); }
});

router.get('/:matricula', async (req, res) => {
    try {
        const data = await repo.buscarPorMatricula(req.params.matricula);
        if (!data) return res.json({ success: false, message: 'No encontrado' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/asignar-cuarto', async (req, res) => {
    try {
        await repo.asignarCuarto(req.body);
        res.json({ success: true, message: 'Asignación guardada' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:matricula', async (req, res) => {
    try {
        await repo.actualizarBasico(req.params.matricula, req.body);
        res.json({ success: true, message: 'Actualizado' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;