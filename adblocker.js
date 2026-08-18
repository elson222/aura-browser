// Aura Built-in High Performance Ad & Tracker Blocker Engine
const path = require('path');

const adDomains = new Set([
  // Google Ad Network & Analytics
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'adservice.google.com',
  'adservice.google.co.in',
  'googleads.g.doubleclick.net',
  'stats.g.doubleclick.net',
  'partner.googleadservices.com',
  'pagead2.googlesyndication.com',
  'adwords.google.com',
  'tpc.googlesyndication.com',
  'www.googletagmanager.com',
  'pagead2.googleadservices.com',

  // Major Ad Exchanges & Networks
  'adnxs.com',
  'advertising.com',
  'adtech.de',
  'casalemedia.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'criteo.net',
  'yieldmanager.com',
  'outbrain.com',
  'taboola.com',
  'adroll.com',
  'smartadserver.com',
  'exponential.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'zeroredirect1.com',
  'moatads.com',
  'adcolony.com',
  'unityads.unity3d.com',
  'applovin.com',
  'inmobi.com',
  'chartboost.com',
  'ironsrc.com',
  'vungle.com',
  'scorecardresearch.com',
  'quantserve.com',
  'clicksor.com',
  'bidswitch.net',
  'serving-sys.com',
  'adblade.com',
  'mgid.com',
  'adtrue.com',
  'adsterra.com',
  'adspirit.de',
  'revcontent.com',
  'zedo.com',
  'contextweb.com',
  'undertone.com',
  'tribalfusion.com',
  'chitika.net',
  'chitika.com',
  'mathtag.com',
  'sovrn.com',
  'sharethrough.com',
  'teads.tv',
  'triplelift.com',
  'unruly.co',
  'hotjar.com',
  'mouseflow.com',
  'crazyegg.com',
  'luckyorange.net',
  'fullstory.com',
  'clarity.ms',
  'segment.io',
  'mixpanel.com',
  'amplitude.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'facebook.net/tr',
  'connect.facebook.net/signals',
  'analytics.twitter.com',
  'static.ads-twitter.com',
  'ads-api.twitter.com',
  'ads.tiktok.com',
  'analytics.tiktok.com',
  'ads.pinterest.com',
  'ct.pinterest.com',
  'ad.atdmt.com',
  'flashtalking.com',
  'media.net',
  'amazon-adsystem.com',
  'aax-us-east.amazon-adsystem.com',
  's.amazon-adsystem.com',
  'ezoic.net',
  'ezoic.com',
  'buysellads.com',
  'buysellads.net',
  'carbonads.net',
  'infolinks.com',
  'bidvertiser.com',
  'adpushup.com'
]);

// URL keywords / sub-strings indicative of ad & tracking scripts
const adUrlPatterns = [
  /\/pagead\//i,
  /\/adservice\//i,
  /\/ads\/\w+\.js/i,
  /\/adserver\//i,
  /\/advertisement\//i,
  /\/popunder/i,
  /\/adbanner/i,
  /\/tracking_pixel/i,
  /\/beacon\.js/i,
  /telemetry\.mozilla/i,
  /google-analytics\.com\/analytics\.js/i,
  /googletagmanager\.com\/gtm\.js/i,
  /doubleclick\.net\/tag/i,
  /youtube\.com\/api\/stats\/ads/i,
  /youtube\.com\/pagead\//i,
  /youtube\.com\/ptracking/i
];

const cosmeticCss = `
  /* Clean Global Ad Hiding Rules */
  ins.adsbygoogle,
  .trc_related_container,
  .taboola-placeholder,
  .outbrain-ad,
  .native-ad-unit,
  .commercial-unit,
  [data-ad-unit],
  [data-ad-slot],
  [data-ad-client],
  ytd-action-companion-ad-renderer,
  ytd-banner-promo-renderer,
  ytd-ad-slot-renderer,
  ytd-promoted-sparkles-web-renderer,
  #player-ads,
  .ytp-ad-overlay-container,
  ytd-in-feed-ad-layout-renderer,
  ytd-display-ad-renderer,
  ytd-statement-banner-renderer,
  ytd-promoted-video-renderer,
  div[id^="google_ads_"],
  div[id^="dfp-ad-"],
  .ad-container,
  .ad-box,
  .advertisement-container {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    min-height: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`;

const youtubeAdBlockScript = `
(function() {
  if (window.__aura_yt_adblock_installed__) return;
  window.__aura_yt_adblock_installed__ = true;

  // 1. Intercept fetch & XHR player responses to strip adPlacements
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
    if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json.adPlacements) delete json.adPlacements;
        if (json.adSlots) delete json.adSlots;
        if (json.playerAds) delete json.playerAds;
        if (json.playbackTracking) {
          delete json.playbackTracking.videostatsPlaybackUrl;
          delete json.playbackTracking.videostatsDelayplayUrl;
          delete json.playbackTracking.videostatsWatchtimeUrl;
        }
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch (e) {}
    }
    return response;
  };

  // 2. High-frequency video ad fast-forward & skip loop
  function clearYouTubeAds() {
    // Instant click skip button
    const skipButtons = document.querySelectorAll(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .videoAdUiSkipButton, button.ytp-ad-skip-button-text'
    );
    skipButtons.forEach(b => b.click());

    // Instant fast-forward & mute video ads
    const adShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
    const video = document.querySelector('video');
    if (adShowing && video) {
      video.muted = true;
      video.playbackRate = 16.0;
      if (!isNaN(video.duration) && isFinite(video.duration)) {
        video.currentTime = video.duration - 0.1;
      }
    }

    // Remove promo banners, companion ads, and sponsored cards
    const adElements = document.querySelectorAll(
      'ytd-action-companion-ad-renderer, ytd-banner-promo-renderer, ytd-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, #player-ads, .ytp-ad-overlay-container, ytd-in-feed-ad-layout-renderer, ytd-display-ad-renderer, ytd-statement-banner-renderer, ytd-promoted-video-renderer'
    );
    adElements.forEach(el => el.remove());
  }

  setInterval(clearYouTubeAds, 50);
  document.addEventListener('DOMContentLoaded', clearYouTubeAds);
})();
`;

const generalAdBlockScript = `
(function() {
  if (window.__aura_adblock_cleaner__) return;
  window.__aura_adblock_cleaner__ = true;

  function cleanAdElements() {
    const selectors = [
      'ins.adsbygoogle',
      'iframe[id*="google_ads"]',
      'div[id*="google_ads"]',
      'div[id*="dfp-ad"]',
      'div[id*="taboola"]',
      'div[id*="outbrain"]',
      'div[class*="sponsored-post"]',
      'div[data-ad-unit]',
      'div[data-ad-slot]'
    ];
    document.querySelectorAll(selectors.join(', ')).forEach(el => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  setInterval(cleanAdElements, 400);
})();
`;

let blockedCount = 0;

function isAdUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  if (url.startsWith('file:') || url.startsWith('devtools:') || url.startsWith('chrome-extension:')) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    for (const domain of adDomains) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    // YouTube ad streams & tracking
    if (url.includes('youtube.com/api/stats/ads') ||
        url.includes('youtube.com/pagead/') ||
        url.includes('youtube.com/ptracking') ||
        (url.includes('youtube.com/api/stats/qoe') && url.includes('adformat')) ||
        (url.includes('googlevideo.com/videoplayback') && (url.includes('adformat') || url.includes('ctier=')))) {
      return true;
    }

    for (const pattern of adUrlPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }
  } catch (err) {
    for (const domain of adDomains) {
      if (url.includes(domain)) return true;
    }
  }

  return false;
}

function setupAdBlocker(session, isEnabled, onBlock) {
  session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!isEnabled()) {
      return callback({ cancel: false });
    }

    if (isAdUrl(details.url)) {
      blockedCount++;
      if (onBlock) onBlock(blockedCount, details.url);
      return callback({ cancel: true });
    }

    return callback({ cancel: false });
  });
}

async function injectCosmeticFilters(webContents, enabled) {
  if (!enabled || !webContents || webContents.isDestroyed()) return null;
  try {
    await webContents.insertCSS(cosmeticCss);
    const url = webContents.getURL() || '';
    if (url.includes('youtube.com')) {
      await webContents.executeJavaScript(youtubeAdBlockScript).catch(() => {});
    } else {
      await webContents.executeJavaScript(generalAdBlockScript).catch(() => {});
    }
    return true;
  } catch (e) {
    return null;
  }
}

function getBlockedCount() {
  return blockedCount;
}

function resetBlockedCount() {
  blockedCount = 0;
}

module.exports = {
  adDomains,
  cosmeticCss,
  youtubeAdBlockScript,
  generalAdBlockScript,
  isAdUrl,
  setupAdBlocker,
  injectCosmeticFilters,
  getBlockedCount,
  resetBlockedCount
};
