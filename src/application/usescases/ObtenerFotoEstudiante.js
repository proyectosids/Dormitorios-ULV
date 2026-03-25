export class ObtenerFotoEstudiante {
    constructor(estudianteRepo) {
        this.estudianteRepo = estudianteRepo;
    }

    async ejecutar(matricula) {
        const foto = await this.estudianteRepo.obtenerFotoBinaria(matricula);
        if (!foto) throw new Error('Foto no encontrada');
        return foto;
    }
}