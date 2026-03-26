import { Router } from 'express';
import { UsuarioAdminRepositorySql } from '../../repositories/UsuarioAdminRepositorySql.js';
import { CambiarRolUsuario } from '../../../application/usescases/CambiarRolUsuario.js';

const router = Router();
const repo = new UsuarioAdminRepositorySql();
const cambiarRolUC = new CambiarRolUsuario(repo);

router.get('/monitores', async (req, res) => {
    try {
        const data = await repo.listarMonitores();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.put('/:usuarioID/rol', async (req, res) => {
    try {
        const { usuarioID } = req.params;
        const { nuevoRol } = req.body;
        await cambiarRolUC.ejecutar(usuarioID, nuevoRol);
        res.json({ success: true, message: 'Rol del usuario actualizado correctamente.' });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

export default router;