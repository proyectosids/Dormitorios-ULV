export class Firma {
    constructor({ idDocumento, tipo, firmaBase64 }) {
        this.idDocumento = idDocumento;
        this.tipo = tipo.toUpperCase();
        this.firmaBase64 = firmaBase64;
        this.fechaFirma = new Date();
    }

    static esTipoValido(tipo) {
        const tiposPermitidos = ['REPORTE', 'AMONESTACION'];
        return tiposPermitidos.includes(tipo.toUpperCase());
    }
}