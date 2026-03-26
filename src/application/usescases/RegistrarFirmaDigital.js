import { Firma } from '../../domain/Firma.js';

export class RegistrarFirmaDigital {
    constructor(firmaRepo) {
        this.firmaRepo = firmaRepo;
    }

    async ejecutar(datos) {
        if (!Firma.esTipoValido(datos.tipo)) {
            throw new Error('Tipo de documento no válido para firma');
        }

        const firma = new Firma(datos);
        const exito = await this.firmaRepo.guardarFirma(firma.idDocumento, firma.tipo, firma.firmaBase64);
        
        if (!exito) throw new Error('No se encontró el registro para firmar');
        return true;
    }
}