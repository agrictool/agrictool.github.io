/**
 * Cloudinary upload utility
 * Uses unsigned uploads via an Upload Preset — no backend needed.
 * Free tier: 25 GB storage, 25 GB bandwidth/month.
 *
 * Required environment variables:
 *   VITE_CLOUDINARY_CLOUD_NAME   — your Cloudinary cloud name
 *   VITE_CLOUDINARY_UPLOAD_PRESET — your unsigned upload preset name
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string

export class CloudinaryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudinaryError'
  }
}

/**
 * Compress an image file to a target max KB using browser Canvas.
 * Falls back gracefully if compression cannot reach the target.
 */
export function compressImage(file: File, maxKB = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 1200
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new CloudinaryError('Canvas context unavailable'))
      ctx.drawImage(img, 0, 0, width, height)

      // Determine output type — keep PNG for logos (transparency), JPEG for screenshots
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      let quality = 0.88

      const tryCompress = () => {
        canvas.toBlob(
          blob => {
            if (!blob) return reject(new CloudinaryError('Canvas toBlob failed'))
            if (blob.size <= maxKB * 1024 || quality <= 0.25) return resolve(blob)
            quality -= 0.1
            tryCompress()
          },
          outputType,
          quality,
        )
      }
      tryCompress()
    }
    img.onerror = () => reject(new CloudinaryError('Image failed to load for compression'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file type and size before upload.
 * Returns an error string or null if valid.
 */
export function validateImage(file: File, maxMB = 2): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return 'Only JPG, PNG or WebP images are accepted.'
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `Image must be under ${maxMB} MB.`
  }
  return null
}

export interface CloudinaryUploadResult {
  url: string          // secure HTTPS URL — store this in Firestore
  publicId: string     // Cloudinary public ID — store this for future deletion/management
  width: number
  height: number
  format: string
  bytes: number
}

/**
 * Upload a file (or blob) to Cloudinary using an unsigned upload preset.
 * Compresses the image before uploading.
 *
 * @param file     Original File from the input
 * @param folder   Cloudinary folder path e.g. "toolkit-images" or "settings"
 * @param filename Optional public ID suffix for the file
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
  filename?: string,
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new CloudinaryError(
      'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env.local file.',
    )
  }

  // Compress before upload
  const compressed = await compressImage(file, 200)

  const formData = new FormData()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const blobFilename = filename ? `${filename}.${ext}` : file.name
  formData.append('file', compressed, blobFilename)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  if (filename) formData.append('public_id', filename)

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new CloudinaryError(
      `Cloudinary upload failed: ${errorData?.error?.message ?? response.statusText}`,
    )
  }

  const data = await response.json()

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
    width: data.width as number,
    height: data.height as number,
    format: data.format as string,
    bytes: data.bytes as number,
  }
}
