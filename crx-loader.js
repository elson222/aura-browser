const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const unzipper = require('unzipper');

/**
 * Extracts a .crx or .zip buffer into a target directory
 * @param {Buffer|string} crxSource 
 * @param {string} targetDir 
 */
async function extractCrx(crxSource, targetDir) {
  const buffer = Buffer.isBuffer(crxSource) ? crxSource : fs.readFileSync(crxSource);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let zipOffset = 0;
  if (buffer.length > 4 && buffer.toString('utf8', 0, 4) === 'Cr24') {
    const pkIndex = buffer.indexOf(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    if (pkIndex !== -1) {
      zipOffset = pkIndex;
    } else {
      throw new Error('Invalid CRX format: Zip payload not found');
    }
  } else {
    const pkIndex = buffer.indexOf(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    if (pkIndex !== -1) zipOffset = pkIndex;
  }

  const zipBuffer = buffer.subarray(zipOffset);
  const directory = await unzipper.Open.buffer(zipBuffer);
  await directory.extract({ path: targetDir });
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
