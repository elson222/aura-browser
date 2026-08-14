const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const http = require('http');

/**
 * Extracts a ZIP buffer into a target directory using Node.js built-in zlib
 * @param {Buffer} zipBuffer 
 * @param {string} targetDir 
 */
function extractZipBuffer(zipBuffer, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let offset = 0;
  while (offset < zipBuffer.length - 4) {
    const signature = zipBuffer.readUInt32LE(offset);
    
    // Local file header: PK\x03\x04 (0x04034b50)
    if (signature === 0x04034b50) {
      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
      const extraFieldLength = zipBuffer.readUInt16LE(offset + 28);

      const fileNameStart = offset + 30;
      const fileName = zipBuffer.toString('utf8', fileNameStart, fileNameStart + fileNameLength);
      const fileDataStart = fileNameStart + fileNameLength + extraFieldLength;
      const fileDataEnd = fileDataStart + compressedSize;

      const safeFileName = path.normalize(fileName).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(targetDir, safeFileName);

      if (fileName.endsWith('/') || fileName.endsWith('\\')) {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      } else {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        const rawData = zipBuffer.subarray(fileDataStart, fileDataEnd);
        let uncompressedData;

        if (compressionMethod === 0) {
          // Stored (no compression)
          uncompressedData = rawData;
        } else if (compressionMethod === 8) {
          // Deflated
          try {
            uncompressedData = zlib.inflateRawSync(rawData);
          } catch (err) {
            try {
              uncompressedData = zlib.inflateSync(rawData);
            } catch (e2) {
              console.error(`Failed to inflate ${fileName}:`, e2.message);
              uncompressedData = rawData;
            }
          }
        } else {
          uncompressedData = rawData;
        }

        fs.writeFileSync(fullPath, uncompressedData);
      }

      offset = fileDataEnd;
    } else if (signature === 0x02014b50) {
      // Central directory header - we reached end of local entries
      break;
    } else {
      offset++;
    }
  }
}

/**
 * Extracts a .crx file or buffer into a target directory
 * @param {Buffer|string} crxSource 
 * @param {string} targetDir 
 */
function extractCrx(crxSource, targetDir) {
  const buffer = Buffer.isBuffer(crxSource) ? crxSource : fs.readFileSync(crxSource);

  // Check for CRX magic 'Cr24' (0x34327243)
  let zipOffset = 0;
  if (buffer.length > 4 && buffer.toString('utf8', 0, 4) === 'Cr24') {
    // Find PK\x03\x04 inside the CRX
    const pkIndex = buffer.indexOf(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    if (pkIndex !== -1) {
      zipOffset = pkIndex;
    } else {
      throw new Error('Invalid CRX format: Zip payload not found');
    }
  } else if (buffer.indexOf(Buffer.from([0x50, 0x4B, 0x03, 0x04])) !== -1) {
    // Direct zip
    zipOffset = buffer.indexOf(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
  }

  const zipBuffer = buffer.subarray(zipOffset);
  extractZipBuffer(zipBuffer, targetDir);
}

/**
 * Download a CRX file from Chrome Web Store by Extension ID
 * @param {string} extensionId 
 * @returns {Promise<Buffer>}
 */
function downloadCrxFromWebStore(extensionId) {
  return new Promise((resolve, reject) => {
    // Chrome Web Store CRX download URL
    const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=126.0.0.0&acceptformat=crx2,crx3&x=id%3D${encodeURIComponent(extensionId)}%26uc`;

    function fetchUrl(targetUrl, redirects = 0) {
      if (redirects > 5) {
        return reject(new Error('Too many redirects while downloading extension'));
      }

      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, redirects + 1);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download extension: HTTP ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    }

    fetchUrl(url);
  });
}

/**
 * Extracts Chrome extension ID from URL or raw ID
 * @param {string} input 
 * @returns {string|null}
 */
function parseExtensionId(input) {
  const trimmed = input.trim();
  // Check if it's already a 32-char alphanumeric extension ID
  if (/^[a-z]{32}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  // Check for Chrome Web Store URL format
  const match = trimmed.match(/\/([a-z]{32})(\/|\?|$)/i) || trimmed.match(/id=([a-z]{32})/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return null;
}

module.exports = {
  extractZipBuffer,
  extractCrx,
  downloadCrxFromWebStore,
  parseExtensionId
};
