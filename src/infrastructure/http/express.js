import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importación de rutas (Asegúrate de que las rutas sean correctas desde esta carpeta)
import authRoutes from './routes/auth.js';
import limpiezaRoutes from './routes/limpieza.js'; 
import estudiatesRoutes from './routes/estudiantes.js';
import dormitoriosRoutes from './routes/dormitorios.js';
import cultosRoutes from './routes/cultos.js';
import reportesRoutes from './routes/reportes.js';
import amonestacionesRoutes from './routes/amonestaciones.js';
import asistenciaRoutes from './routes/asistencia.js';
import usuariosRoutes from './routes/usuarios.js';
import configuracionRoutes from './routes/configuracion.js';
import firmasRoutes from './routes/firmas.js';

dotenv.config();
const app = express();

app.use(cors());

// ✅ Mantenemos tus límites críticos de 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🔗 Registramos TODAS las rutas para que la App no falle
app.use('/api/auth', authRoutes);
app.use('/api/limpieza', limpiezaRoutes); // Usando la nueva lógica
app.use('/api/estudiantes', estudiatesRoutes);
app.use('/api/dormitorios', dormitoriosRoutes);
app.use('/api/cultos', cultosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/amonestaciones', amonestacionesRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/firmas', firmasRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).send('API Hogar Universitario (Clean Architecture) funcionando 🚀');
});

export default app;