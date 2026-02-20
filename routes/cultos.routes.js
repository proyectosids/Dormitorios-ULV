import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// Obtener los tipos de culto del catálogo en producción
router.get('/tipos', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        IdTipoCulto, 
        Nombre 
      FROM dormi.Cat_TipoCulto
      ORDER BY Nombre ASC 
    `);
    
    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('Error en GET /api/cultos/tipos (dormi):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los tipos de culto disponibles.', 
      error: error.message 
    });
  }
});

export default router;