export class Semestre {
    constructor({ idSemestre, nombre, fechaInicio = new Date(), fechaFin = null, activo = 1 }) {
        this.idSemestre = idSemestre;
        this.nombre = nombre;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.activo = activo;
    }
}