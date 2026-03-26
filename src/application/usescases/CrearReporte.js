import { Reporte } from '../../domain/Reporte.js';

export class CrearReporte {
    constructor(reporteRepo, notificationService) {
        this.reporteRepo = reporteRepo;
        this.notificationService = notificationService;
    }

    async ejecutar(datos) {
        const reporte = new Reporte(datos);
        const { amonestacionGenerada } = await this.reporteRepo.crearReporteConAmonestacion(reporte);

        this.notificationService.enviarNotificacion(reporte.matriculaReportado, "📋 Nuevo Reporte", `Se ha registrado: ${reporte.motivo}`);
        
        if (amonestacionGenerada) {
            this.notificationService.enviarNotificacion(reporte.matriculaReportado, "⚠️ Amonestación Automática", "Has acumulado 3 reportes en el mes.");
        }
        return { success: true };
    }
}