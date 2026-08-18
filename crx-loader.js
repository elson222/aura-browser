const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

/**
 * Pure Node.js zero-dependency ZIP / CRX Extractor
 * @param {Buffer|string} crxSource 
 * @param {string} targetDir 
 */
async function extractCrx(crxSource, targetDir) {
  const buffer = Buffer.isBuffer(crxSource) ? crxSource : fs.readFileSync(crxSource);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Find ZIP local file header signature 0x04034b50 (PK\x03\x04)
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0x50 && buffer[offset + 1] === 0x4B &&
        buffer[offset + 2] === 0x03 && buffer[offset + 3] === 0x04) {
      break;
    }
    offset++;
  }

  if (offset >= buffer.length - 4) {
    throw new Error('Invalid CRX/ZIP: No ZIP local file header found');
  }

  let p = offset;
  while (p < buffer.length - 30) {
    const sig = buffer.readUInt32LE(p);
    if (sig !== 0x04034b50) break; // Not a local file header

    const method = buffer.readUInt16LE(p + 8);
    const compressedSize = buffer.readUInt32LE(p + 18);
    const uncompressedSize = buffer.readUInt32LE(p + 22);
    const fileNameLen = buffer.readUInt16LE(p + 26);
    const extraLen = buffer.readUInt16LE(p + 28);

    const fileName = buffer.toString('utf8', p + 30, p + 30 + fileNameLen);
    const dataOffset = p + 30 + fileNameLen + extraLen;
    const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);

    // Prevent directory traversal attacks
    const safePath = path.normalize(fileName).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(targetDir, safePath);

    if (fileName.endsWith('/') || fileName.endsWith('\\')) {
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    } else {
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

      let uncompressedData;
      if (method === 0) {
        uncompressedData = compressedData;
      } else if (method === 8) {
        uncompressedData = zlib.inflateRawSync(compressedData);
      } else {
        try {
          uncompressedData = zlib.inflateRawSync(compressedData);
        } catch (e) {
          uncompressedData = compressedData;
        }
      }

      fs.writeFileSync(fullPath, uncompressedData);
    }

    p = dataOffset + compressedSize;
  }
}

/**
 * Download a CRX file from Chrome Web Store by Extension ID
 * @param {string} extensionId 
 * @returns {Promise<Buffer>}
 */
function downloadCrxFromWebStore(extensionId) {
  return new Promise((resolve, reject) => {
    // Official Google Chrome Web Store CRX download API (Chromium 131 standard)
    const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=131.0.6778.86&acceptformat=crx2,crx3&x=id%3D${encodeURIComponent(extensionId)}%26uc`;

    function fetchUrl(targetUrl, redirects = 0) {
      if (redirects > 8) {
        return reject(new Error('Too many redirects while downloading extension'));
      }

      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': '*/*'
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
  if (/^[a-z]{32}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const match = trimmed.match(/\/([a-z]{32})(\/|\?|$)/i) || trimmed.match(/id=([a-z]{32})/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return null;
}

module.exports = {
  extractCrx,
  downloadCrxFromWebStore,
  parseExtensionId
};
