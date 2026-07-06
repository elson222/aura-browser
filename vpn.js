const { session, net } = require('electron');

let vpnEnabled = false;
let currentProxy = '';

async function fetchProxies() {
  try {
    const response = await net.fetch("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=1500&country=all&ssl=all&anonymity=all");
    const text = await response.text();
    return text.split('\n').map(p => p.trim()).filter(Boolean);
  } catch (err) {
    console.error("Failed to fetch proxies:", err);
    return [];
  }
}

async function testProxy(proxy) {
  return new Promise((resolve) => {
    const ses = session.fromPartition('proxy-test');
    ses.setProxy({ proxyRules: `socks5://${proxy}` })
      .then(() => {
        const req = net.request({
          method: 'GET',
          url: 'https://www.google.com',
          session: ses
        });
        
        req.on('response', (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.setTimeout(2500); // 2.5 seconds timeout
        req.end();
      })
      .catch(() => resolve(false));
  });
}

async function startVPN() {
  vpnEnabled = true;
  const list = await fetchProxies();
  if (list.length === 0) {
    vpnEnabled = false;
    return false;
  }
  
  // Try the first 20 proxies to find a working one
  const limit = Math.min(list.length, 20);
  for (let i = 0; i < limit; i++) {
    if (!vpnEnabled) return false;
    const proxy = list[i];
    const ok = await testProxy(proxy);
    if (ok) {
      currentProxy = proxy;
      await session.defaultSession.setProxy({ proxyRules: `socks5://${proxy}` });
      return true;
    }
  }
  
  vpnEnabled = false;
  return false;
}

async function stopVPN() {
  vpnEnabled = false;
  currentProxy = '';
  await session.defaultSession.setProxy({ proxyRules: '' });
  return true;
}

module.exports = {
  startVPN,
  stopVPN,
  isVPNEnabled: () => vpnEnabled,
  getCurrentProxy: () => currentProxy
};
