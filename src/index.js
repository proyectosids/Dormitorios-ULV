import 'dotenv/config'; 
import app from './infrastructure/http/express.js';
import './services/cron.service.js'; // Mantienes tus servicios en segundo plano

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`📂 Capa de Infraestructura: Express configurado correctamente`);
});