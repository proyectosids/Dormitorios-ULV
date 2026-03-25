export class Limpieza {
    constructor({ 
        idCuarto, 
        evaluadoPorMatricula, 
        observaciones, 
        ordenGeneral, 
        disciplina, 
        totalFinal, 
        urlFoto = null, 
        publicIdFoto = null 
    }) {
        this.idCuarto = idCuarto;
        this.fecha = new Date();
        this.evaluadoPorMatricula = evaluadoPorMatricula;
        this.observaciones = observaciones;
        this.ordenGeneral = parseInt(ordenGeneral) || 0;
        this.disciplina = parseInt(disciplina) || 0;
        this.totalFinal = totalFinal;
        this.urlFoto = urlFoto;
        this.publicIdFoto = publicIdFoto;
    }

    // Regla de negocio/El total es la suma de todo
    static calcularTotal(detalles, orden, disciplina) {
        const subtotal = detalles.reduce((acc, item) => acc + (parseInt(item.calificacion) || 0), 0);
        return subtotal + (parseInt(orden) || 0) + (parseInt(disciplina) || 0);
    }
}