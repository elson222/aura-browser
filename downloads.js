/**
 * AuraBrowser Downloads Module
 * Handles media detection, download management, and YouTube stream resolution.
 * Works with Electron's session.on('will-download') and webRequest APIs.
 */

const { app, dialog, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Download state
let downloads = [];
let detectedMedia = {};
let downloadIdCounter = 0;
const downloadsDir = app.getPath('downloads');

// Media MIME types to detect
const MEDIA_TYPES = {
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo', 'video/x-flv', 'video/3gpp'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/flac', 'audio/x-m4a', 'audio/aac'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff']
};

// File extensions for media
const MEDIA_EXTENSIONS = {
  video: ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.3gp', '.m4v', '.wmv'],
  audio: ['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac', '.wma', '.opus'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico']
};

// Minimum size thresholds (bytes) to avoid detecting tiny resources
const SIZE_THRESHOLDS = {
  video: 512 * 1024,    // 512KB
  audio: 64 * 1024,     // 64KB
  image: 20 * 1024      // 20KB
};

/**
 * Detect media type from Content-Type header or URL extension
 */
function detectMediaType(contentType, url) {
  const ct = (contentType || '').toLowerCase().split(';')[0].trim();
  const ext = path.extname(new URL(url, 'http://localhost').pathname).toLowerCase();

  for (const [type, mimes] of Object.entries(MEDIA_TYPES)) {
    if (mimes.some(mime => ct.includes(mime))) return type;
  }

  for (const [type, exts] of Object.entries(MEDIA_EXTENSIONS)) {
    if (exts.includes(ext)) return type;
  }

  // Check for octet-stream with media extension
  if (ct === 'application/octet-stream') {
    for (const [type, exts] of Object.entries(MEDIA_EXTENSIONS)) {
      if (exts.includes(ext)) return type;
    }
  }

  return null;
}

/**
 * Extract filename from URL or Content-Disposition
 */
function extractFilename(url, headers) {
  // Try Content-Disposition header
  let disposition = '';
  const rawDisp = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (Array.isArray(rawDisp)) {
    disposition = rawDisp[0] || '';
  } else if (typeof rawDisp === 'string') {
    disposition = rawDisp;
  }

  const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (filenameMatch) {
    return filenameMatch[1].replace(/['"]/g, '').trim();
  }

  // Extract from URL
  try {
    const urlPath = new URL(url, 'http://localhost').pathname;
    const basename = path.basename(urlPath);
    if (basename && basename !== '/' && basename.includes('.')) {
      return decodeURIComponent(basename);
    }
  } catch {}

  return 'download';
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Check if URL is a YouTube video page
 */
function isYouTubeVideo(url) {
  return /^https?:\/\/(www\.)?youtube\.com\/watch\?/.test(url) ||
         /^https?:\/\/youtu\.be\//.test(url);
}

/**
 * Extract YouTube video ID
 */
function extractYouTubeId(url) {
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
                url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Detect media on a YouTube page by running JS in the page context
 */
async function detectYouTubeMedia(webContents) {
  try {
    const url = webContents.getURL();
    const videoId = extractYouTubeId(url);
    if (!videoId) return [];

    // Get video title from page
    const title = await webContents.executeJavaScript(
      `document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title')?.textContent?.trim() || document.title`
    );

    const cleanTitle = (title || `YouTube_${videoId}`)
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);

    // Create download entries for common qualities
    const qualities = [
      { label: '1080p', itag: 137, ext: 'mp4' },
      { label: '720p', itag: 22, ext: 'mp4' },
      { label: '480p', itag: 135, ext: 'mp4' },
      { label: '360p', itag: 18, ext: 'mp4' },
      { label: 'Audio Only (128k)', itag: 140, ext: 'm4a' },
    ];

    return [{
      id: `yt-${videoId}`,
      filename: `${cleanTitle}.mp4`,
      url: url,
      type: 'video',
      size: null,
      quality: '720p',
      qualities: qualities.map(q => q.label),
      isYouTube: true,
      videoId: videoId,
      icon: '🎬'
    }];
  } catch (err) {
    console.error('YouTube detection failed:', err.message);
    return [];
  }
}

/**
 * Scan a webContents page DOM for playable videos/audio, or resolve YouTube streams
 * @param {Electron.WebContents} webContents
 * @returns {Promise<Array>} List of detected media items
 */
async function scanPageForMedia(webContents) {
  const url = webContents.getURL();
  if (!url || url.startsWith('file://') || url.startsWith('chrome://') || url.startsWith('devtools://')) {
    return [];
  }

  // Clear previous media entries for this URL
  detectedMedia[url] = [];

  // 1. YouTube specific scan
  if (isYouTubeVideo(url)) {
    const ytMedia = await detectYouTubeMedia(webContents);
    detectedMedia[url] = ytMedia;
    return ytMedia;
  }

  // 2. Generic HTML5 Media element scan via JS injection
  try {
    const scraped = await webContents.executeJavaScript(`
      (function() {
        const list = [];
        
        // Scan video tags
        document.querySelectorAll('video').forEach((v, index) => {
          let src = v.src || v.querySelector('source')?.src;
          if (src && src.startsWith('http')) {
            let name = 'Video_' + (index + 1);
            try {
              name = src.split('/').pop().split('?')[0] || name;
            } catch(e) {}
            list.push({
              id: 'scraped-vid-' + index,
              filename: name.includes('.') ? name : name + '.mp4',
              url: src,
              type: 'video',
              size: null,
              quality: 'Original',
              icon: '🎬'
            });
          }
        });

        // Scan audio tags
        document.querySelectorAll('audio').forEach((a, index) => {
          let src = a.src || a.querySelector('source')?.src;
          if (src && src.startsWith('http')) {
            let name = 'Audio_' + (index + 1);
            try {
              name = src.split('/').pop().split('?')[0] || name;
            } catch(e) {}
            list.push({
              id: 'scraped-aud-' + index,
              filename: name.includes('.') ? name : name + '.mp3',
              url: src,
              type: 'audio',
              size: null,
              quality: 'Original',
              icon: '🎵'
            });
          }
        });

        return list;
      })()
    `);

    detectedMedia[url] = scraped || [];
    return detectedMedia[url];
  } catch (err) {
    console.error('General media scraping failed:', err.message);
    return [];
  }
}

/**
 * Get detected media for a page URL
 */
function getDetectedMedia(pageUrl) {
  return detectedMedia[pageUrl] || [];
}

/**
 * Clear detected media for a page
 */
function clearDetectedMedia(pageUrl) {
  delete detectedMedia[pageUrl];
}

/**
 * Setup download tracking on a session
 * @param {Electron.Session} session
 * @param {Function} onUpdate - callback(downloads[])
 */
function setupDownloadTracking(session, onUpdate) {
  session.on('will-download', (event, item, webContents) => {
    const id = `dl-${++downloadIdCounter}`;
    const filename = item.getFilename();
    const savePath = path.join(downloadsDir, filename);

    // Avoid overwriting — append number if exists
    let finalPath = savePath;
    let counter = 1;
    while (fs.existsSync(finalPath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      finalPath = path.join(downloadsDir, `${name} (${counter})${ext}`);
      counter++;
    }

    item.setSavePath(finalPath);

    const download = {
      id,
      filename: path.basename(finalPath),
      path: finalPath,
      url: item.getURL(),
      size: item.getTotalBytes(),
      received: 0,
      speed: 0,
      state: 'downloading',
      startTime: Date.now(),
      _item: item // internal reference
    };

    downloads.push(download);
    onUpdate(getPublicDownloads());

    let lastReceived = 0;
    let lastTime = Date.now();

    item.on('updated', (event, state) => {
      const now = Date.now();
      const received = item.getReceivedBytes();
      const elapsed = (now - lastTime) / 1000;

      download.received = received;
      download.size = item.getTotalBytes() || download.size;
      download.speed = elapsed > 0 ? (received - lastReceived) / elapsed : 0;
      download.state = state === 'interrupted' ? 'paused' : 'downloading';

      lastReceived = received;
      lastTime = now;

      onUpdate(getPublicDownloads());
    });

    item.once('done', (event, state) => {
      download.received = download.size;
      download.speed = 0;
      download.state = state === 'completed' ? 'completed' : 'failed';
      onUpdate(getPublicDownloads());
    });
  });
}

/**
 * Start a download by URL
 */
function startDownload(mainWindow, url) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.downloadURL(url);
  }
}

/**
 * Pause a download
 */
function pauseDownload(id) {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl._item && dl._item.canResume && dl.state === 'downloading') {
    dl._item.pause();
    dl.state = 'paused';
  }
}

/**
 * Resume a download
 */
function resumeDownload(id) {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl._item && dl.state === 'paused') {
    dl._item.resume();
    dl.state = 'downloading';
  }
}

/**
 * Cancel a download
 */
function cancelDownload(id) {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl._item) {
    dl._item.cancel();
    dl.state = 'cancelled';
  }
}

/**
 * Open a downloaded file
 */
function openDownload(id) {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl.path && fs.existsSync(dl.path)) {
    shell.openPath(dl.path);
  }
}

/**
 * Open the folder containing a download
 */
function openDownloadFolder(id) {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl.path && fs.existsSync(dl.path)) {
    shell.showItemInFolder(dl.path);
  }
}

/**
 * Clear completed downloads from the list
 */
function clearDownloads() {
  downloads = downloads.filter(d => d.state === 'downloading' || d.state === 'paused');
}

/**
 * Retry a failed download
 */
function retryDownload(mainWindow, id) {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl.url) {
    downloads = downloads.filter(d => d.id !== id);
    startDownload(mainWindow, dl.url);
  }
}

/**
 * Get downloads without internal Electron references (safe for IPC)
 */
function getPublicDownloads() {
  return downloads.map(d => ({
    id: d.id,
    filename: d.filename,
    path: d.path,
    url: d.url,
    size: d.size,
    sizeFormatted: formatSize(d.size),
    received: d.received,
    receivedFormatted: formatSize(d.received),
    speed: d.speed,
    speedFormatted: d.speed > 0 ? `${formatSize(d.speed)}/s` : '',
    state: d.state,
    progress: d.size > 0 ? Math.round((d.received / d.size) * 100) : 0
  }));
}

module.exports = {
  scanPageForMedia,
  setupDownloadTracking,
  getDetectedMedia,
  clearDetectedMedia,
  detectYouTubeMedia,
  startDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  openDownload,
  openDownloadFolder,
  clearDownloads,
  retryDownload,
  getPublicDownloads,
  isYouTubeVideo,
  formatSize
};
