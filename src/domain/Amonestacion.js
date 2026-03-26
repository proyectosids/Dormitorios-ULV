export class Amonestacion {
    constructor({ idAmonestacion, matriculaEstudiante, clavePreceptor, idNivel, motivo, fecha = new Date() }) {
        this.idAmonestacion = idAmonestacion;
        this.matriculaEstudiante = matriculaEstudiante;
        this.clavePreceptor = clavePreceptor;
        this.idNivel = idNivel;
        this.motivo = motivo;
        this.fecha = fecha;
    }
}