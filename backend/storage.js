require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Uploads an image and returns BOTH the URL (stored as image_filename) and the
// Cloudinary public_id (stored so we can delete the image later). We use the
// public_id Cloudinary actually assigns (result.public_id) rather than guessing
// it, which avoids the folder-nesting ambiguity.
async function uploadImage(buffer, filename) {
  return new Promise((resolve, reject) => {
    const publicId = `electronics-quiz/${filename.replace(/\.[^/.]+$/, '')}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        folder: 'electronics-quiz',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    uploadStream.end(buffer);
  });
}

// Deletes an image from Cloudinary by its public_id. Best-effort: returns a
// result object and never throws for a missing/empty id, so callers can treat
// image cleanup as non-fatal.
async function deleteImage(publicId) {
  if (!publicId) return { result: 'skipped', reason: 'no public_id' };
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = { uploadImage, deleteImage };
