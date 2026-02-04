import { Router } from 'express';
import { getConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// ==========================================
// 1. OBTENER TIPOS DE CULTO (Catálogo)
// ==========================================
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
    console.error('Error en GET /api/cultos/tipos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los tipos de culto disponibles.', 
      error: error.message 
    });
  }
});

export default router;