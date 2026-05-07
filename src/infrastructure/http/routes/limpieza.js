import { Router } from 'express';
import multer from 'multer';
import { RegistrarLimpieza } from '../../../application/usescases/RegistrarLimpieza.js';
import { LimpiezaRepositorySql } from '../../repositories/LimpiezaRepositorySql.js';
import { subirImagen } from '../../../services/cloudinary.service.js';
import { enviarNotificacion } from '../../../services/notification.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Instanciamos las dependencias
const repo = new LimpiezaRepositorySql();
const cloudinaryService = { subirImagen }; // Adaptador simple
const notificationService = { enviarNotificacion };

// Instanciamos el Caso de Uso
const registrarUsecase = new RegistrarLimpieza(repo, cloudinaryService, notificationService);

router.post('/registrar', upload.single('evidencia'), async (req, res) => {
    try {
        const { idCuarto, evaluadoPor, detallesMatutinos, ordenGeneral, disciplina, observaciones } = req.body;
        
        // Adaptación de datos de entrada (Data Mapper)
        const criterios = typeof detallesMatutinos === 'string' ? JSON.parse(detallesMatutinos) : detallesMatutinos;
        
        const datos = {
            idCuarto,
            evaluadoPorMatricula: evaluadoPor,
            criterios,
            ordenGeneral,
            disciplina,
            observaciones
        };

        // Ejecutamos el Caso de Uso
        const resultado = await registrarUsecase.ejecutar(datos, req.file);

        res.status(201).json({ success: true, ...resultado });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;