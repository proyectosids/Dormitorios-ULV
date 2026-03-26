import { UsuarioAdmin } from '../../domain/UsuarioAdmin.js';

export class CambiarRolUsuario {
    constructor(usuarioRepo) {
        this.usuarioRepo = usuarioRepo;
    }

    async ejecutar(usuarioID, nuevoRol) {
        if (!UsuarioAdmin.esRolValido(nuevoRol)) {
            throw new Error('El nuevoRol debe ser 2 (Monitor) o 3 (Estudiante).');
        }

        const rolActual = await this.usuarioRepo.obtenerRolActual(usuarioID);
        if (rolActual === undefined) throw new Error('El usuario especificado no existe.');
        if (rolActual === nuevoRol) throw new Error('El usuario ya tiene ese rol.');

        return await this.usuarioRepo.actualizarRol(usuarioID, nuevoRol);
    }
}