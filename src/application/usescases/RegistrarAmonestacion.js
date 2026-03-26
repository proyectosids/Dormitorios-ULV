import { Amonestacion } from '../../domain/Amonestacion.js';

export class RegistrarAmonestacion {
    constructor(amonestacionRepo, notificationService) {
        this.amonestacionRepo = amonestacionRepo;
        this.notificationService = notificationService;
    }

    async ejecutar(datos) {
        const amonestacion = new Amonestacion(datos);
        await this.amonestacionRepo.registrar(amonestacion);

        this.notificationService.enviarNotificacion(
            amonestacion.matriculaEstudiante,
            "⚠️ Nueva Amonestación",
            `Se ha registrado una amonestación: ${amonestacion.motivo}. Favor de pasar a firmar.`
        );
        return { success: true };
    }
}