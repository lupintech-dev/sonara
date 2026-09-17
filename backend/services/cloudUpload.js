// backend/services/cloudUpload.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} opts
 * @param {string} opts.folder - e.g. 'sonara/audio', 'sonara/covers', 'sonara/avatars'
 * @param {string} [opts.resourceType='image'] - 'image' or 'video' (audio uses 'video')
 * @param {string} [opts.publicId]
 * @param {string} [opts.format]
 */
export async function uploadBuffer(buffer, { folder, resourceType = 'image', publicId, format } = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
      unique_filename: true,
      overwrite: false,
    };
    if (publicId) options.public_id = publicId;
    if (format) options.format = format;

    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        resourceType: result.resource_type,
      });
    });

    stream.end(buffer);
  });
}

/** Delete a Cloudinary asset by public ID. Silently ignores errors. */
export async function deleteAsset(publicId, resourceType = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('[cloudinary] delete failed:', publicId, err.message);
  }
}

/** Extract Cloudinary public ID + resource type from a URL. Returns null for non-Cloudinary URLs. */
export function publicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return match ? { publicId: match[2], resourceType: match[1] } : null;
}
