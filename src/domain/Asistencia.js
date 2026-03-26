export class Asistencia {
    constructor({ matriculaEstudiante, idTipoCulto, registradoPor, fecha = new Date() }) {
        this.matriculaEstudiante = matriculaEstudiante;
        this.idTipoCulto = idTipoCulto;
        this.registradoPor = registradoPor;
        this.fecha = fecha;
    }
}