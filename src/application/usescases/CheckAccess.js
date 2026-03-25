import axios from 'axios';
export class CheckAccess {
    async ejecutar(usuarioID, idRol) {
        const response = await axios.get(`https://ulv-api.apps.isdapps.uk/api/datos/${usuarioID}`);
        if (idRol === 3) {
            const student = response.data?.Data?.student?.[0];
            if (!student || student.RESIDENCIA !== 'INTERNO') throw new Error('Solo internos permitidos');
        }
        return true;
    }
}