/**
 * Pure Node.js QR code generator — no network dependency.
 * Uses the 'qrcode' npm package (already available via react's qrcode.react root).
 * Falls back gracefully if package unavailable.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function generateQRDataURL(text) {
  try {
    const QRCode = require('qrcode');
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: { dark: '#1a1a1a', light: '#ffffff' }
    });
    return dataUrl;
  } catch (e) {
    // Return null — frontend will render its own QR via qrcode.react
    return null;
  }
}
