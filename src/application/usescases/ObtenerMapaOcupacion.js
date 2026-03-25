export class ObtenerMapaOcupacion {
    constructor(dormitorioRepo) {
        this.dormitorioRepo = dormitorioRepo;
    }

    async ejecutar() {
        // Podrías agregar lógica de filtrado o agrupación aquí si Flutter lo requiere
        return await this.dormitorioRepo.obtenerMapaOcupacion();
    }
}