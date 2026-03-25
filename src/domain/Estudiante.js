export class Estudiante {
    constructor({ matricula, nombreCompleto, carrera, idCuarto = 0, numeroCuarto = null, idPasillo = 0, idDormitorio = 0 }) {
        this.matricula = matricula;
        this.nombreCompleto = nombreCompleto;
        this.carrera = carrera;
        this.idCuarto = idCuarto;
        this.numeroCuarto = numeroCuarto;
        this.idPasillo = idPasillo;
        this.idDormitorio = idDormitorio;
    }
}