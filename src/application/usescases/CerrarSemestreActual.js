export class CerrarSemestreActual {
    constructor(configuracionRepo) {
        this.configuracionRepo = configuracionRepo;
    }

    async ejecutar(nombreNuevoSemestre) {
        if (!nombreNuevoSemestre) {
            throw new Error('El nombre del nuevo semestre es obligatorio');
        }
        return await this.configuracionRepo.procesarCierreSemestre(nombreNuevoSemestre);
    }
}