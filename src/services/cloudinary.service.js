import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

// ⚙️ Configuración de Cloudinary usando variables de entorno
// Asegúrate de que tu archivo .env tenga CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

/**
 * Sube una imagen a Cloudinary desde un buffer (Multer)
 * @param {Buffer} fileBuffer - El buffer de la imagen recibida por Multer
 * @returns {Promise<{url: string, publicId: string}>} - URL y ID de la imagen
 */

export const subirImagen = async (fileBuffer) => {
  const bufferOptimizado = await sharp(fileBuffer)
    .resize(800)
    .jpeg({ quality:70 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'evidencias_limpieza' },
      (error, result) => {
        if (error)  reject(error);
          else resolve({ 
          url: result.secure_url, 
          publicId: result.public_id 
        });
      }
    );
    // Finaliza el stream enviando el buffer de la imagen
    uploadStream.end(bufferOptimizado);
  });
};
