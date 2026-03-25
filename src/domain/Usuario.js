export class Usuario {
    constructor({ usuarioID, password, idRol, nombreCompleto, correo, carrera = null, idCuarto = 0, idPasillo = 0, idDormitorio = 0 }) {
        this.usuarioID = usuarioID;
        this.password = password; // Hashed password
        this.idRol = idRol;
        this.nombreCompleto = nombreCompleto;
        this.correo = correo;
        this.carrera = carrera;
        this.idCuarto = idCuarto;
        this.idPasillo = idPasillo;
        this.idDormitorio = idDormitorio;
    }
}