export class UsuarioAdmin {
    constructor({ usuarioID, nombreCompleto, idRol }) {
        this.usuarioID = usuarioID;
        this.nombreCompleto = nombreCompleto;
        this.idRol = idRol;
    }

    // Regla de negocio: Solo permitimos roles de Monitor (2) o Estudiante (3)
    static esRolValido(rol) {
        return [2, 3].includes(rol);
    }
}