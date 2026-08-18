const searchInput = typeof document !== 'undefined' ? document.getElementById('search-input') : null;
const suggestionsList = typeof document !== 'undefined' ? document.getElementById('suggestions-list') : null;

let historyList = [];
let bookmarksList = [];
let suggestionItems = [];
let selectedIndex = -1;

const svgIcons = {
  google: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  ddg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  bing: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  wiki: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  youtube: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  github: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
  bookmark: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  history: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  calc: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>`
};

const searchEngines = [
  { prefix: '!g', name: 'Google', icon: svgIcons.google },
  { prefix: '!d', name: 'DuckDuckGo', icon: svgIcons.ddg },
  { prefix: '!ddg', name: 'DuckDuckGo', icon: svgIcons.ddg },
  { prefix: '!b', name: 'Bing', icon: svgIcons.bing },
  { prefix: '!bing', name: 'Bing', icon: svgIcons.bing },
  { prefix: '!w', name: 'Wikipedia', icon: svgIcons.wiki },
  { prefix: '!wiki', name: 'Wikipedia', icon: svgIcons.wiki },
  { prefix: '!y', name: 'YouTube', icon: svgIcons.youtube },
  { prefix: '!yt', name: 'YouTube', icon: svgIcons.youtube },
  { prefix: '!gh', name: 'GitHub', icon: svgIcons.github }
];

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (searchInput) searchInput.focus();
  });

  if (window.electronAPI && window.electronAPI.onFocusSearch) {
    window.electronAPI.onFocusSearch((data) => {
      historyList = data.history || [];
      bookmarksList = data.bookmarks || [];
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      selectedIndex = -1;
      renderSuggestions();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      selectedIndex = -1;
      renderSuggestions();
    });
  }
}

function evaluateMathExpression(str) {
  if (!str || typeof str !== 'string') return null;
  const expr = str.trim();
  if (!/^[\d\.\s\+\-\*\/\(\)\^\%]+$/.test(expr) || !/[\+\-\*\/\^]/.test(expr)) {
    return null;
  }

  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d|\./.test(ch)) {
      let num = '';
      while (i < expr.length && /[\d\.]/.test(expr[i])) {
        num += expr[i++];
      }
      tokens.push({ type: 'number', val: parseFloat(num) });
      continue;
    }
    if ('+-*/^()%'.includes(ch)) {
      tokens.push({ type: 'op', val: ch });
      i++;
      continue;
    }
    return null;
  }
  if (tokens.length === 0) return null;

  let pos = 0;
  function parseExpression() {
    let result = parseTerm();
    while (pos < tokens.length && (tokens[pos].val === '+' || tokens[pos].val === '-')) {
      const op = tokens[pos++].val;
      const right = parseTerm();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }

  function parseTerm() {
    let result = parseFactor();
    while (pos < tokens.length && (tokens[pos].val === '*' || tokens[pos].val === '/' || tokens[pos].val === '%')) {
      const op = tokens[pos++].val;
      const right = parseFactor();
      if (op === '*') result *= right;
      else if (op === '/') { if (right === 0) return null; result /= right; }
      else if (op === '%') result %= right;
    }
    return result;
  }

  function parseFactor() {
    let result = parsePrimary();
    if (pos < tokens.length && tokens[pos].val === '^') {
      pos++;
      const exp = parseFactor();
      result = Math.pow(result, exp);
    }
    return result;
  }

  function parsePrimary() {
    if (pos >= tokens.length) return null;
    const token = tokens[pos++];
    if (token.type === 'number') return token.val;
    if (token.val === '+') return parsePrimary();
    if (token.val === '-') return -parsePrimary();
    if (token.val === '(') {
      const val = parseExpression();
      if (pos < tokens.length && tokens[pos].val === ')') pos++;
      return val;
    }
    return null;
  }

  try {
    const val = parseExpression();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val) && pos === tokens.length) {
      return Number.isInteger(val) ? val : parseFloat(val.toFixed(4));
    }
  } catch (e) {}
  return null;
}

function renderSuggestions() {
  const query = searchInput.value.trim().toLowerCase();
  suggestionsList.innerHTML = '';
  suggestionItems = [];

  // Instant Calculator Check
  const mathResult = evaluateMathExpression(searchInput.value.trim());
  if (mathResult !== null) {
    suggestionItems.push({
      title: `${searchInput.value.trim()} = ${mathResult}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchInput.value.trim())}`,
      type: 'calculator',
      icon: svgIcons.calc
    });
  }

  // 1. Check Search Engine Shortcuts
  if (query.startsWith('!')) {
    const spaceIndex = query.indexOf(' ');
    const prefix = spaceIndex === -1 ? query : query.substring(0, spaceIndex);

    const matchingEngines = searchEngines.filter(engine => engine.prefix.startsWith(prefix));

    matchingEngines.forEach(engine => {
      const searchTerms = spaceIndex === -1 ? '' : searchInput.value.substring(spaceIndex + 1).trim();
      const displayTitle = searchTerms ? `Search ${engine.name} for "${searchTerms}"` : `Use ${engine.name} Search`;

      suggestionItems.push({
        title: displayTitle,
        url: searchTerms ? `${engine.prefix} ${searchTerms}` : engine.prefix,
        type: 'engine',
        icon: engine.icon
      });
    });
  }

  // 2. Filter Bookmarks & History
  if (query && !query.startsWith('!')) {
    bookmarksList.forEach(bookmark => {
      if (bookmark.title.toLowerCase().includes(query) || bookmark.url.toLowerCase().includes(query)) {
        suggestionItems.push({
          title: bookmark.title,
          url: bookmark.url,
          type: 'bookmark',
          icon: svgIcons.bookmark
        });
      }
    });

    historyList.forEach(history => {
      if (history.title.toLowerCase().includes(query) || history.url.toLowerCase().includes(query)) {
        const alreadyAdded = suggestionItems.some(item => item.url === history.url);
        if (!alreadyAdded) {
          suggestionItems.push({
            title: history.title,
            url: history.url,
            type: 'history',
            icon: svgIcons.history
          });
        }
      }
    });
  } else if (!query) {
    bookmarksList.forEach(bookmark => {
      suggestionItems.push({
        title: bookmark.title,
        url: bookmark.url,
        type: 'bookmark',
        icon: svgIcons.bookmark
      });
    });

    historyList.slice(0, 10).forEach(history => {
      const alreadyAdded = suggestionItems.some(item => item.url === history.url);
      if (!alreadyAdded) {
        suggestionItems.push({
          title: history.title,
          url: history.url,
          type: 'history',
          icon: svgIcons.history
        });
      }
    });
  }

  suggestionItems = suggestionItems.slice(0, 12);

  if (suggestionItems.length > 0) {
    suggestionsList.classList.add('show');
    suggestionItems.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'suggestion-item';

      let badgeClass = 'badge-engine';
      if (item.type === 'bookmark') badgeClass = 'badge-bookmark';
      else if (item.type === 'history') badgeClass = 'badge-history';
      else if (item.type === 'calculator') badgeClass = 'badge-engine';

      itemEl.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-url">${item.url}</div>
        </div>
        <div class="item-badge ${badgeClass}">${item.type}</div>
      `;

      itemEl.addEventListener('click', () => {
        window.electronAPI.performNavigation(item.url);
      });

      suggestionsList.appendChild(itemEl);
    });
  } else {
    suggestionsList.classList.remove('show');
  }
}

if (searchInput) {
  searchInput.addEventListener('keydown', (event) => {
    const items = suggestionsList ? suggestionsList.querySelectorAll('.suggestion-item') : [];

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestionItems.length === 0) return;
      selectedIndex = (selectedIndex + 1) % suggestionItems.length;
      updateSelection(items);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestionItems.length === 0) return;
      selectedIndex = (selectedIndex - 1 + suggestionItems.length) % suggestionItems.length;
      updateSelection(items);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestionItems.length) {
        if (window.electronAPI) window.electronAPI.performNavigation(suggestionItems[selectedIndex].url);
      } else {
        const value = searchInput.value.trim();
        if (window.electronAPI) window.electronAPI.performNavigation(value);
      }
    } else if (event.key === 'Escape') {
      if (window.electronAPI) window.electronAPI.cancelSearch();
    }
  });
}

function updateSelection(items) {
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
      if (suggestionItems[index].type === 'engine' && !suggestionItems[index].url.includes(' ')) {
        if (searchInput) searchInput.value = suggestionItems[index].url + ' ';
      }
    } else {
      item.classList.remove('selected');
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    evaluateMathExpression,
    safeEvaluateMath: evaluateMathExpression
  };
}
