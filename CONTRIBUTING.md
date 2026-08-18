# Contributing to Aura Browser 🚀

First off, thank you for considering contributing to **Aura Browser**! It's people like you that make Aura a faster, cleaner, and truly immersive fullscreen web browser.

---

## 👨‍💻 Project Author & Lead Maintainer

* **Author / Creator**: Cornel Media ([@elson222](https://github.com/elson222))
* **Email**: [info@cornel.media](mailto:info@cornel.media)
* **Official Repository**: [https://github.com/elson222/aura-browser](https://github.com/elson222/aura-browser)

Feel free to open an issue, start a discussion, or reach out directly for any questions, suggestions, or collaborations.

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or newer)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* Git

### Step-by-Step Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/elson222/aura-browser.git
   cd aura-browser
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Browser in Development Mode**:
   ```bash
   npm start
   ```

4. **Run the Automated Test Suite**:
   ```bash
   npm test
   ```

---

## 🏛️ Codebase Architecture Overview

* **`main.js`**: Core Electron lifecycle, atomic data persistence (`userData.json`), lazy overlay windows, and native session management.
* **`tab-manager.js`**: Multi-tab management engine with crash recovery, `Ctrl+Shift+T` tab restore stack, and native context menus.
* **`default-extensions/ublock-origin/`**: Native bundled **uBlock Origin** engine providing out-of-the-box ad, tracker, and popup blocking.
* **`search.js` / `search.html`**: Spotlight HUD Omnibox with recursive arithmetic parsing, history, bookmarks, and DuckDuckGo bangs.
* **`zen-features.js`**: Zen-style vertical tab sidebar (hovering left edge $X \le 16\text{px}$ or pressing `Ctrl + B`).
* **`mouse-gestures.js`**: Smooth trackpad two-finger swipe navigation (swipe right to go back, left to go forward) and right-click gestures.
* **`downloads.js`**: Path-contained file downloader with sanitization against Windows reserved devices.

---

## 📋 Pull Request Process

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, well-commented code following existing project patterns.
3. Ensure all tests pass:
   ```bash
   npm test
   ```
4. Commit with clear, descriptive messages:
   ```bash
   git commit -m "Add: Your feature description"
   ```
5. Push to your fork and submit a Pull Request to `main`.

---

## 📜 License

By contributing to Aura Browser, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
