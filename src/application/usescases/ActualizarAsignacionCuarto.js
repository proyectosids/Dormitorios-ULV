export class ActualizarAsignacionCuarto {
    constructor(estudianteRepo) {
        this.estudianteRepo = estudianteRepo;
    }

    async ejecutar(datos) {
        if (!datos.matricula || !datos.idCuarto) throw new Error('Datos incompletos');
        return await this.estudianteRepo.asignarCuarto(datos);
    }
}