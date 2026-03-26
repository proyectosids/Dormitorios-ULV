import { Router } from 'express';
import { ConfiguracionRepositorySql } from '../../repositories/ConfiguracionRepositorySql.js';
import { CerrarSemestreActual } from '../../../application/usescases/CerrarSemestreActual.js';

const router = Router();
const repo = new ConfiguracionRepositorySql();
const cerrarSemestreUC = new CerrarSemestreActual(repo);

router.post('/cerrar-semestre', async (req, res) => {
    try {
        const { nombreNuevoSemestre } = req.body;
        await cerrarSemestreUC.ejecutar(nombreNuevoSemestre);
        
        console.log(`✅ Semestre cerrado. Iniciado: ${nombreNuevoSemestre}`);
        res.json({ 
            success: true, 
            message: 'Semestre cerrado y cuartos vaciados correctamente.' 
        });
    } catch (error) {
        console.error("Error en ruta semestre:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al procesar el cierre' 
        });
    }
});

export default router;