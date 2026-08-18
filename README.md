# ✦ Aura Browser

An immersive, distraction-free, completely fullscreen desktop web browser engineered for speed, privacy, and minimalist flow.

[![Release](https://img.shields.io/github/v/release/elson222/aura-browser?style=flat-square&color=blue)](https://github.com/elson222/aura-browser/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## Product Philosophy

Traditional browsers clutter your screen with persistent toolbars, tabs, extensions, and window borders. **Aura Browser** strips away all visual noise to give 100% of your screen to the web. 

Navigation, tab management, and extensions are always available on-demand via smooth edge gestures or keyboard shortcuts without ever obstructing your workspace.

---

## Key Features

### 🗂️ Zen Vertical Tab Sidebar
- **Left-Edge Hover**: Move your cursor to the left edge of your screen to smoothly slide out the **Zen Tab Sidebar**.
- **Rich Tab Cards**: See all open tabs with full page titles, site favicons, active status, and hover close buttons (`✕`).
- **Tab Restore (`Ctrl + Shift + T`)**: Recover closed tabs instantly from the history stack.
- **Crash Resilience**: Automatic background renderer recovery if a page runs out of memory.

### 🧩 Chrome Web Store Extensions Support
- Install extensions directly from the Chrome Web Store using URL or 32-character Extension ID.
- Supports unpacked folders and `.crx` / `.zip` packages.
- Isolated, sandboxed execution with zero privileged Electron access.

### 🛡️ Built-in Privacy & Ad Blocker
- **Network Level Blocking**: Automatically blocks ad networks, trackers, and telemetry scripts before sockets open.
- **Pure Native Web Rendering**: Zero destructive stylesheet overrides or color inversion. Websites render naturally as designed.
- **Encrypted DNS & Privacy Shield**: Integrated Cloudflare & Google DNS-over-HTTPS (DoH) resolution.

### 🔍 Spotlight Omnibox & Search HUD (`Ctrl + L` / `Ctrl + T`)
- **Instant Calculator**: Type math expressions (e.g. `128 * 4` or `(50 + 25) / 5`) for instant evaluated results.
- **Search Bangs**: Search sites directly with shortcuts:
  - `!g query` — Google Search
  - `!d query` — DuckDuckGo
  - `!b query` — Bing
  - `!w query` — Wikipedia
  - `!yt query` — YouTube
  - `!gh query` — GitHub
- **Bookmarks & History Search**: Instant fuzzy suggestions across your saved pages.

### ⚡ 0% Idle CPU Mouse Gestures
- Hold the Right Mouse Button and glide:
  - **Left (`L`)** — Back
  - **Right (`R`)** — Forward
  - **Up (`U`)** — Scroll to top
  - **Down (`D`)** — Scroll to bottom
  - **Down + Right (`DR`)** — Home page
  - **Down + Up (`DU`)** — Open Search HUD

### 💾 Atomic, Corruption-Resistant Persistence
- User settings, history, and bookmarks are written atomically (`.tmp` write + atomic rename) with automated backup snapshots (`userData.json.bak`) to prevent corruption.

---

## Keyboard Shortcuts Quick Sheet

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + T`** | Open New Tab |
| **`Ctrl + W`** | Close Active Tab |
| **`Ctrl + Shift + T`** | Reopen Recently Closed Tab |
| **`Ctrl + Tab`** / **`Ctrl + Shift + Tab`** | Switch to Next / Previous Tab |
| **`Ctrl + 1` .. `Ctrl + 8`** | Jump Directly to Tab 1–8 |
| **`Ctrl + 9`** | Jump to Last Tab |
| **`Ctrl + L`** | Open Search Omnibox HUD |
| **`Ctrl + E`** | Open Extensions Manager |
| **`Ctrl + ,`** | Open Browser Settings |
| **`Ctrl + J`** | Open Downloads Manager |
| **`Ctrl + B`** | Toggle Zen Tab Sidebar |
| **`Ctrl + D`** | Bookmark Current Page |
| **`Ctrl + R`** / **`F5`** | Reload Webpage |
| **`Alt + Left`** / **`Alt + Right`** | Navigate History (Back / Forward) |
| **`Alt + F4`** | Close Application |

---

## Installation & Downloads

### Windows Installers
Download the latest binaries directly from **[GitHub Releases](https://github.com/elson222/aura-browser/releases)**:
1. **`Aura.Browser.Setup.2.1.0.exe`** — Standard Windows installer with desktop and start menu shortcuts.
2. **`Aura.Browser.2.1.0.exe`** — Standalone portable executable (no installation required).

### Building From Source

```bash
# 1. Clone the repository
git clone https://github.com/elson222/aura-browser.git
cd aura-browser

# 2. Install dependencies
npm install

# 3. Start development build
npm start

# 4. Compile distribution binaries
npm run dist
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.
