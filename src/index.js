import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import limpiezaRoutes from './routes/limpieza.routes.js';
import estudiatesRoutes from './routes/estudiantes.routes.js';
import cultosRoutes from './routes/cultos.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import amonestacionesRoutes from './routes/amonestaciones.routes.js';
import asistenciaRoutes from './routes/asistencia.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import dormitoriosRoutes from './routes/dormitorios.routes.js';
import configuracionRoutes from './routes/configuracion.routes.js'

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());   

// 🔗 Rutas
app.use('/api/auth', authRoutes);
app.use('/api/limpieza', limpiezaRoutes);
app.use('/api/estudiantes', estudiatesRoutes);
app.use('/api/dormitorios', dormitoriosRoutes);
app.use('/api/cultos', cultosRoutes);
app.use('/api/reportes', reportesRoutes);   
app.use('/api/amonestaciones', amonestacionesRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/configuracion', configuracionRoutes);

// 🧠 Importante: escuchar en toda la red local
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';  

app.listen(PORT, HOST, () => {
  console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`);
});
