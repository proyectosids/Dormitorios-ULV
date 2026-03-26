export class ReportarInasistenciaMasiva {
    constructor(asistenciaRepo, notificationService) {
        this.asistenciaRepo = asistenciaRepo;
        this.notificationService = notificationService;
    }

    async ejecutar(datos) {
        const resultado = await this.asistenciaRepo.procesarReportesMasivos(
            datos.listaMatriculas, 
            datos.idTipoCulto, 
            datos.reportadoPor, 
            datos.fecha
        );

        // Notificaciones masivas
        datos.listaMatriculas.forEach(matricula => {
            this.notificationService.enviarNotificacion(matricula, "🚫 Falta a Culto", `Reporte generado por inasistencia a: ${resultado.nombreCulto}`);
        });

        return resultado;
    }
}