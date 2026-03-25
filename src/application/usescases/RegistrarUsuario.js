import bcrypt from 'bcryptjs';
export class RegistrarUsuario {
    constructor(usuarioRepo) { this.usuarioRepo = usuarioRepo; }
    async ejecutar(datos) {
        const salt = await bcrypt.genSalt(10);
        datos.password = await bcrypt.hash(datos.password, salt);
        return await this.usuarioRepo.registrarCompleto(datos);
    }
}