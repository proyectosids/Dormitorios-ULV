export class Reporte {
    constructor({ idReporte, matriculaReportado, reportadoPor, tipoUsuarioReportante, motivo, idTipoReporte, estado = 'Pendiente' }) {
        this.idReporte = idReporte;
        this.matriculaReportado = matriculaReportado;
        this.reportadoPor = reportadoPor;
        this.tipoUsuarioReportante = tipoUsuarioReportante;
        this.motivo = motivo;
        this.idTipoReporte = idTipoReporte;
        this.fechaReporte = new Date();
        this.estado = this.definirEstadoInicial(tipoUsuarioReportante, estado);
    }

    definirEstadoInicial(tipo, estadoActual) {
        if (tipo === 'Preceptor') return 'Aprobado';
        return estadoActual;
    }
}