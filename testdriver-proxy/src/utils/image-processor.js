/**
 * Image Processing Utility
 * Handle screenshot compression and format conversion
 */

const sharp = require('sharp');
const { getLogger } = require('./logger');

const logger = getLogger('image-processor');

/**
 * Process screenshot for LLM vision input
 */
async function processScreenshot(base64Image, options = {}) {
  if (!base64Image) {
    return null;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = 'png'
  } = options;

  try {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    logger.debug('Image metadata:', { 
      width: metadata.width, 
      height: metadata.height,
      format: metadata.format,
      size: buffer.length
    });

    // Resize if needed
    let processor = sharp(buffer)
      .resize(maxWidth, maxHeight, { 
        fit: 'inside', 
        withoutEnlargement: true 
      });

    // Convert format
    if (format === 'png') {
      processor = processor.png({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      processor = processor.jpeg({ quality });
    }

    const processed = await processor.toBuffer();
    const processedBase64 = processed.toString('base64');

    logger.debug('Image processed:', {
      originalSize: buffer.length,
      processedSize: processed.length,
      compressionRatio: (processed.length / buffer.length * 100).toFixed(2) + '%'
    });

    return processedBase64;
  } catch (error) {
    logger.error('Screenshot processing error:', error);
    // Return original if processing fails
    return base64Image.replace(/^data:image\/\w+;base64,/, '');
  }
}

/**
 * Validate image format
 */
function isValidImage(base64Image) {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.length > 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  processScreenshot,
  isValidImage
};

