import { Router } from 'express';
import { UsuarioRepositorySql } from '../../repositories/UsuarioRepositorySql.js';
import { LoginUsuario } from '../../../application/usescases/LoginUsuario.js';
import { RegistrarUsuario } from '../../../application/usescases/RegistrarUsuario.js';
import { CheckAccess } from '../../../application/usescases/CheckAccess.js';
import bcrypt from 'bcryptjs';

const router = Router();
const repo = new UsuarioRepositorySql();

//inyeccion de dependencias
const loginUsecase = new LoginUsuario(repo);
const registrarUC = new RegistrarUsuario(repo);
const checkAccessUC = new CheckAccess();

router.post('/login', async (req, res) => {
    try {
        const data = await loginUC.ejecutar(req.body.usuarioID, req.body.password);
        res.json({ success: true, data });
    } catch (e) { res.status(401).json({ success: false, message: e.message }); }
});

router.post('/check-access', async (req, res) => {
    try {
        await checkAccessUC.ejecutar(req.body.usuarioID, req.body.idRol);
        res.json({ success: true, message: 'Acceso autorizado' });
    } catch (e) { res.status(403).json({ success: false, message: e.message }); }
});

router.post('/register', async (req, res) => {
    try {
        await registrarUC.ejecutar(req.body);
        res.json({ success: true, message: 'Registro exitoso' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/reset-password', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(req.body.nuevaPassword, salt);
        const success = await repo.actualizarPasswordPorCorreo(req.body.correo, hashed);
        if (!success) return res.status(404).json({ success: false, message: 'Correo no encontrado' });
        res.json({ success: true, message: 'Password actualizado' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/update-token', async (req, res) => {
    try {
        const id = req.body.matricula || req.body.usuarioID;
        const token = req.body.fcmToken || req.body.token;
        await repo.actualizarTokenFCM(id, token);
        res.json({ success: true, message: 'Token actualizado' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;