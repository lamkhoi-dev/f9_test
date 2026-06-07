import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Saves base64 images inside Vertex AI response candidates locally,
 * and replaces the inlineData with fileData containing the local URL.
 * 
 * @param candidates Candidates array from response
 * @param req Express Request object (to construct base URL if needed)
 * @returns Modified candidates array
 */
export function saveGeneratedImages(candidates: any[] | undefined, req?: any): any[] {
  if (!candidates || !Array.isArray(candidates)) return [];

  const uploadsDir = path.join(__dirname, '../../uploads/generated');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Get base URL for files
  let baseUrl = '';
  if (req) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    baseUrl = `${protocol}://${req.get('host')}`;
  }

  for (const candidate of candidates) {
    const parts = candidate.content?.parts;
    if (!parts || !Array.isArray(parts)) continue;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        try {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          
          // Determine extension
          let ext = 'png';
          if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
          else if (mimeType.includes('webp')) ext = 'webp';

          // Generate file name
          const fileName = `gen_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
          const filePath = path.join(uploadsDir, fileName);

          // Save buffer
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);

          console.log(`💾 Saved generated image locally: ${filePath} (${buffer.length} bytes)`);

          // Replace inlineData with fileData
          const fileUri = `/uploads/generated/${fileName}`;
          const fullUrl = baseUrl ? `${baseUrl}${fileUri}` : fileUri;

          delete part.inlineData;
          part.fileData = {
            mimeType,
            fileUri: fullUrl
          };
        } catch (err) {
          console.error('⚠️ Error saving base64 image locally:', err);
        }
      }
    }
  }

  return candidates;
}
