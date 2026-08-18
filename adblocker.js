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
  's.amazon-adsystem.com'
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
  /doubleclick\.net\/tag/i
];

const cosmeticCss = `
  /* Clean Non-Intrusive Ad Hiding Rules */
  ins.adsbygoogle,
  .trc_related_container,
  .taboola-placeholder,
  .outbrain-ad,
  .native-ad-unit,
  .commercial-unit,
  [data-ad-unit],
  [data-ad-slot],
  [data-ad-client] {
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
    return await webContents.insertCSS(cosmeticCss);
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
  isAdUrl,
  setupAdBlocker,
  injectCosmeticFilters,
  getBlockedCount,
  resetBlockedCount
};
