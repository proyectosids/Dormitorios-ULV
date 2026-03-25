import bcrypt from 'bcryptjs';

export class LoginUsuario {
    constructor(usuarioRepo) {
        this.usuarioRepo = usuarioRepo;
    }

    async ejecutar(usuarioID, password) {
        const usuarioData = await this.usuarioRepo.buscarPorId(usuarioID);
        if (!usuarioData) throw new Error('Usuario no encontrado');

        const isMatch = await bcrypt.compare(password, usuarioData.Password);
        if (!isMatch) throw new Error('Contraseña incorrecta');

        delete usuarioData.Password;
        return usuarioData;
    }
}