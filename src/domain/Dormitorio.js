export class Dormitorio {
    constructor({ idDormitorio, nombre, genero }) {
        this.idDormitorio = idDormitorio;
        this.nombre = nombre;
        this.genero = genero;
    }
}

export class Pasillo {
    constructor({ idPasillo, idDormitorio, nombrePasillo }) {
        this.idPasillo = idPasillo;
        this.idDormitorio = idDormitorio;
        this.nombrePasillo = nombrePasillo;
    }
}

export class Cuarto {
    constructor({ idCuarto, idPasillo, numeroCuarto, capacidad }) {
        this.idCuarto = idCuarto;
        this.idPasillo = idPasillo;
        this.numeroCuarto = numeroCuarto;
        this.capacidad = capacidad;
    }
}