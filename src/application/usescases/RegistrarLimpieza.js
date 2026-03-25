import { Limpieza } from '../../domain/Limpieza.js';

export class RegistrarLimpieza {
    constructor(limpiezaRepo, cloudinaryService, notificationService) {
        this.limpiezaRepo = limpiezaRepo;
        this.cloudinaryService = cloudinaryService;
        this.notificationService = notificationService;
    }

    async ejecutar(datos, archivoFoto) {
        let urlFoto = null;
        let publicId = null;

        // 1. Subir imagen si existe (Cloudinary)
        if (archivoFoto) {
            const uploadResult = await this.cloudinaryService.subirImagen(archivoFoto.buffer);
            urlFoto = uploadResult.url;
            publicId = uploadResult.publicId;
        }

        // 2. Calcular total (Lógica de Negocio)
        const total = Limpieza.calcularTotal(datos.criterios, datos.ordenGeneral, datos.disciplina);

        // 3. Crear el objeto de Dominio
        const nuevaLimpieza = new Limpieza({
            ...datos,
            totalFinal: total,
            urlFoto,
            publicIdFoto: publicId
        });

        // 4. Guardar en SQL a través del Repositorio
        const idLimpieza = await this.limpiezaRepo.guardar(nuevaLimpieza, datos.criterios);

        // 5. Enviar Notificaciones a los estudiantes
        try {
            const estudiantes = await this.limpiezaRepo.obtenerEstudiantesPorCuarto(datos.idCuarto);
            estudiantes.forEach(est => {
                this.notificationService.enviarNotificacion(
                    est.Matricula,
                    "Limpieza Calificada",
                    `Tu cuarto ha sido evaluado con ${total} puntos.`
                );
            });
        } catch (e) { console.error("Error notificaciones:", e); }

        return { idLimpieza, urlFoto };
    }
}