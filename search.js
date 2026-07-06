const searchInput = document.getElementById('search-input');
const suggestionsList = document.getElementById('suggestions-list');

let historyList = [];
let bookmarksList = [];
let suggestionItems = []; // List of active suggestions objects
let selectedIndex = -1;

// List of search engine shortcuts details
const searchEngines = [
  { prefix: '!d', name: 'DuckDuckGo', icon: '🦆' },
  { prefix: '!ddg', name: 'DuckDuckGo', icon: '🦆' },
  { prefix: '!g', name: 'Google', icon: '🔍' },
  { prefix: '!b', name: 'Bing', icon: '🔎' },
  { prefix: '!bing', name: 'Bing', icon: '🔎' },
  { prefix: '!w', name: 'Wikipedia', icon: '📚' },
  { prefix: '!wiki', name: 'Wikipedia', icon: '📚' },
  { prefix: '!y', name: 'YouTube', icon: '📺' },
  { prefix: '!yt', name: 'YouTube', icon: '📺' }
];

window.addEventListener('DOMContentLoaded', () => {
  searchInput.focus();
});

// Main process sends history and bookmarks on overlay show
window.electronAPI.onFocusSearch((data) => {
  historyList = data.history || [];
  bookmarksList = data.bookmarks || [];
  searchInput.value = '';
  selectedIndex = -1;
  renderSuggestions();
  searchInput.focus();
});

searchInput.addEventListener('input', () => {
  selectedIndex = -1;
  renderSuggestions();
});

function renderSuggestions() {
  const query = searchInput.value.trim().toLowerCase();
  suggestionsList.innerHTML = '';
  suggestionItems = [];

  // 1. Check for search engine shortcut suggestions
  if (query.startsWith('!')) {
    const spaceIndex = query.indexOf(' ');
    const prefix = spaceIndex === -1 ? query : query.substring(0, spaceIndex);
    
    // Find matching shortcuts
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
    // Filter bookmarks
    bookmarksList.forEach(bookmark => {
      if (bookmark.title.toLowerCase().includes(query) || bookmark.url.toLowerCase().includes(query)) {
        suggestionItems.push({
          title: bookmark.title,
          url: bookmark.url,
          type: 'bookmark',
          icon: '⭐️'
        });
      }
    });

    // Filter history
    historyList.forEach(history => {
      if (history.title.toLowerCase().includes(query) || history.url.toLowerCase().includes(query)) {
        // avoid duplicating items already matched in bookmarks
        const alreadyAdded = suggestionItems.some(item => item.url === history.url);
        if (!alreadyAdded) {
          suggestionItems.push({
            title: history.title,
            url: history.url,
            type: 'history',
            icon: '🕒'
          });
        }
      }
    });
  } else if (!query) {
    // If input is empty, show all Bookmarks & Recent History
    bookmarksList.forEach(bookmark => {
      suggestionItems.push({
        title: bookmark.title,
        url: bookmark.url,
        type: 'bookmark',
        icon: '⭐️'
      });
    });

    historyList.slice(0, 10).forEach(history => {
      const alreadyAdded = suggestionItems.some(item => item.url === history.url);
      if (!alreadyAdded) {
        suggestionItems.push({
          title: history.title,
          url: history.url,
          type: 'history',
          icon: '🕒'
        });
      }
    });
  }

  // Limit suggestions list count to 15
  suggestionItems = suggestionItems.slice(0, 15);

  // Render elements
  if (suggestionItems.length > 0) {
    suggestionsList.classList.add('show');
    suggestionItems.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'suggestion-item';
      
      const badgeClass = item.type === 'bookmark' ? 'badge-bookmark' : (item.type === 'history' ? 'badge-history' : 'badge-engine');
      const badgeText = item.type;

      itemEl.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-url">${item.url}</div>
        </div>
        <div class="item-badge ${badgeClass}">${badgeText}</div>
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

searchInput.addEventListener('keydown', (event) => {
  const items = suggestionsList.querySelectorAll('.suggestion-item');

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
      window.electronAPI.performNavigation(suggestionItems[selectedIndex].url);
    } else {
      const value = searchInput.value.trim();
      window.electronAPI.performNavigation(value);
    }
  } else if (event.key === 'Escape') {
    window.electronAPI.cancelSearch();
  }
});

function updateSelection(items) {
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      // Scroll into view if needed
      item.scrollIntoView({ block: 'nearest' });
      // Update input text to reflect shortcut or search engine text
      if (suggestionItems[index].type === 'engine' && !suggestionItems[index].url.includes(' ')) {
        searchInput.value = suggestionItems[index].url + ' ';
      }
    } else {
      item.classList.remove('selected');
    }
  });
}
