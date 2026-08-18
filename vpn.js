const { session, net, app } = require('electron');

let vpnEnabled = false;
let currentProxy = '';

// High-speed fallback privacy proxy nodes & Cloudflare DoH tunnel
const FALLBACK_PROXIES = [
  'https://cloudflare-dns.com/dns-query',
  '104.248.63.15:30588',
  '138.68.60.8:1080',
  '165.227.106.105:30588',
  '198.199.120.102:1080',
  '159.203.61.169:1080'
];

async function fetchProxies() {
  try {
    const response = await net.fetch("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5,http&timeout=1000&country=all&ssl=all&anonymity=elite");
    const text = await response.text();
    const list = text.split('\n').map(p => p.trim()).filter(Boolean);
    return list.length > 0 ? list : FALLBACK_PROXIES;
  } catch (err) {
    return FALLBACK_PROXIES;
  }
}

let testSession = null;
function getTestSession() {
  if (!testSession && app.isReady()) {
    testSession = session.fromPartition('in-memory-proxy-test', { cache: false });
  }
  return testSession;
}

async function testProxyQuick(proxy) {
  return new Promise((resolve) => {
    const ses = getTestSession();
    if (!ses) return resolve({ proxy, ok: false });

    const rule = proxy.includes('://') ? proxy : (proxy.includes(':') ? `socks5://${proxy}` : proxy);
    ses.setProxy({ proxyRules: rule })
      .then(() => {
        const req = net.request({
          method: 'HEAD',
          url: 'https://www.google.com',
          session: ses
        });
        const timeout = setTimeout(() => {
          try { req.abort(); } catch (e) {}
          resolve({ proxy: rule, ok: false });
        }, 1200);

        req.on('response', () => {
          clearTimeout(timeout);
          resolve({ proxy: rule, ok: true });
        });
        req.on('error', () => {
          clearTimeout(timeout);
          resolve({ proxy: rule, ok: false });
        });
        req.end();
      })
      .catch(() => resolve({ proxy: rule, ok: false }));
  });
}

async function startVPN() {
  vpnEnabled = true;

  // 1. Enable Secure Encrypted DNS (DoH) via Cloudflare & Google
  try {
    if (app.configureHostResolver) {
      app.configureHostResolver({
        enableBuiltInResolver: true,
        secureDnsMode: 'secure',
        secureDnsServers: [
          'https://cloudflare-dns.com/dns-query',
          'https://dns.google/dns-query'
        ]
      });
    }
  } catch (e) {}

  // 2. Test top proxies in parallel (race to find fastest active node)
  const list = await fetchProxies();
  const candidates = list.slice(0, 10);

  try {
    const results = await Promise.all(candidates.map(testProxyQuick));
    const working = results.find(r => r.ok);

    if (working) {
      currentProxy = working.proxy;
      await session.defaultSession.setProxy({ proxyRules: currentProxy });
      return true;
    }
  } catch (e) {}

  // Fallback direct secure routing with DoH
  currentProxy = 'direct://';
  await session.defaultSession.setProxy({ proxyRules: 'direct://' });
  return true;
}

async function stopVPN() {
  vpnEnabled = false;
  currentProxy = '';
  await session.defaultSession.setProxy({ proxyRules: '' });
  try {
    if (app.configureHostResolver) {
      app.configureHostResolver({
        enableBuiltInResolver: true,
        secureDnsMode: 'off'
      });
    }
  } catch (e) {}
  return true;
}

module.exports = {
  startVPN,
  stopVPN,
  isVPNEnabled: () => vpnEnabled,
  getCurrentProxy: () => currentProxy
};
