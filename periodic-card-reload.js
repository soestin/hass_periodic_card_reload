class PeriodicCardReload extends HTMLElement {
  constructor() {
    super();
    this._cards = [];
    this._config = {};
    this._intervalId = null;
  }

  setConfig(config) {
    if (!config.cards || !Array.isArray(config.cards)) {
      throw new Error("You need to define 'cards'");
    }

    this._config = {
      delay: config.delay || 30,
      cards: config.cards,
    };
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._container) {
      this._buildCard();
    }

    this._cards.forEach((card) => {
      card.hass = hass;
    });
  }

  _buildCard() {
    this._container = document.createElement("div");
    this.appendChild(this._container);

    this._createCards();
    this._startInterval();
  }

  async _createCards() {
    this._cards = [];
    this._container.innerHTML = "";

    const helpers = await this._loadCardHelpers();

    for (const cardConfig of this._config.cards) {
      const card = await helpers.createCardElement(cardConfig);
      card.hass = this._hass;
      this._cards.push(card);
      this._container.appendChild(card);
    }
  }

  async _loadCardHelpers() {
    if (this._helpers) {
      return this._helpers;
    }

    this._helpers = await window.loadCardHelpers();
    return this._helpers;
  }

  _startInterval() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }

    const delayMs = this._config.delay * 1000;
    this._intervalId = setInterval(() => {
      this._reloadCards();
    }, delayMs);
  }

  async _reloadCards() {
    await this._createCards();
  }

  disconnectedCallback() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  getCardSize() {
    return this._cards.reduce((total, card) => {
      return total + (card.getCardSize ? card.getCardSize() : 1);
    }, 0);
  }

  static getConfigElement() {
    return document.createElement("periodic-card-reload-editor");
  }

  static getStubConfig() {
    return {
      delay: 30,
      cards: [],
    };
  }
}

customElements.define("periodic-card-reload", PeriodicCardReload);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "periodic-card-reload",
  name: "Periodic Card Reload",
  description: "A container that periodically reloads its child cards",
});

// Visual Editor - Exact copy of vertical-stack editor
class PeriodicCardReloadEditor extends HTMLElement {
  static get properties() {
    return {
      hass: {},
      lovelace: {},
      _config: {},
      _selectedCard: {},
      _GUImode: {},
      _guiModeAvailable: {},
    };
  }

  constructor() {
    super();
    this._config = { cards: [], delay: 30 };
    this._selectedCard = 0;
    this._GUImode = true;
    this._guiModeAvailable = true;
    this._clipboard = null;
  }

  set hass(hass) {
    this._hass = hass;
    const editor = this.querySelector("hui-card-element-editor");
    if (editor) editor.hass = hass;
    const picker = this.querySelector("hui-card-picker");
    if (picker) picker.hass = hass;
  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    this._config = {
      ...config,
      cards: config.cards || [],
      delay: config.delay || 30,
    };
    this.render();
  }

  render() {
    if (!this._hass || !this._config) return;

    const selected = this._selectedCard;
    const numcards = this._config.cards.length;
    const isGuiMode = this._GUImode;

    this.innerHTML = `
      <style>
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .tab-bar {
          display: flex;
          flex-grow: 1;
          min-width: 0;
          overflow-x: auto;
          background: var(--card-background-color, var(--ha-card-background, #fff));
          border-radius: 8px;
        }
        .tab {
          padding: 8px 16px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--primary-text-color);
          font-size: 14px;
          font-weight: 500;
          border-bottom: 2px solid transparent;
          transition: border-color 0.2s, color 0.2s;
        }
        .tab:hover {
          color: var(--primary-color);
        }
        .tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }
        .add-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .add-btn:hover {
          background: var(--secondary-background-color);
        }
        .add-btn svg {
          width: 24px;
          height: 24px;
        }
        #card-options {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          margin-bottom: 8px;
        }
        #card-options button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        #card-options button:hover:not(:disabled) {
          background: var(--secondary-background-color);
        }
        #card-options button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        #card-options button svg {
          width: 24px;
          height: 24px;
        }
        .gui-mode-button {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
        #editor {
          border: 1px solid var(--divider-color);
          padding: 12px;
          border-radius: 8px;
        }
        .delay-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .delay-row label {
          font-weight: 500;
        }
        .delay-row input {
          width: 100px;
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: var(--input-fill-color, var(--secondary-background-color));
          color: var(--primary-text-color);
        }
        @media (max-width: 450px) {
          #editor {
            margin: 0 -12px;
            border-radius: 0;
          }
        }
      </style>

      <div class="delay-row">
        <label for="delay">Reload delay (seconds)</label>
        <input type="number" id="delay" min="1" value="${this._config.delay}">
      </div>

      <div class="card-config">
        <div class="toolbar">
          <div class="tab-bar" id="tab-bar">
            ${this._config.cards.map((_, i) => `
              <button class="tab ${i === selected ? 'active' : ''}" data-index="${i}">${i + 1}</button>
            `).join('')}
          </div>
          <button class="add-btn" id="add-btn" title="Add card">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
          </button>
        </div>

        <div id="editor">
          ${selected < numcards ? `
            <div id="card-options">
              <button class="gui-mode-button" id="toggle-mode" title="${isGuiMode ? 'Show code editor' : 'Show visual editor'}" ${!this._guiModeAvailable ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="${isGuiMode
                  ? 'M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19M12,15A1,1 0 0,1 13,16A1,1 0 0,1 12,17A1,1 0 0,1 11,16A1,1 0 0,1 12,15M8,15A1,1 0 0,1 9,16A1,1 0 0,1 8,17A1,1 0 0,1 7,16A1,1 0 0,1 8,15M16,15A1,1 0 0,1 17,16A1,1 0 0,1 16,17A1,1 0 0,1 15,16A1,1 0 0,1 16,15Z'
                  : 'M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,20L1.5,16.5L2.91,15.09L5,17.17L9.59,12.59L11,14L5,20Z'}"/></svg>
              </button>
              <button id="move-prev" title="Move before" ${selected === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/></svg>
              </button>
              <button id="move-next" title="Move after" ${selected === numcards - 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>
              </button>
              <button id="copy-card" title="Copy">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>
              </button>
              <button id="cut-card" title="Cut">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,3L13,9L15,11L22,4V3M12,12.5A0.5,0.5 0 0,1 11.5,12A0.5,0.5 0 0,1 12,11.5A0.5,0.5 0 0,1 12.5,12A0.5,0.5 0 0,1 12,12.5M6,20A2,2 0 0,1 4,18C4,16.89 4.9,16 6,16A2,2 0 0,1 8,18C8,19.11 7.1,20 6,20M6,8A2,2 0 0,1 4,6C4,4.89 4.9,4 6,4A2,2 0 0,1 8,6C8,7.11 7.1,8 6,8M9.64,7.64C9.87,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.87 7.64,9.64L10,12L7.64,14.36C7.14,14.13 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.87,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64Z"/></svg>
              </button>
              <button id="delete-card" title="Delete">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
              </button>
            </div>
            <div id="editor-container"></div>
          ` : `
            <div id="picker-container"></div>
          `}
        </div>
      </div>
    `;

    this._bindEvents();

    if (selected < numcards) {
      this._loadCardEditor(selected);
    } else {
      this._loadCardPicker();
    }
  }

  _bindEvents() {
    // Delay input
    const delayInput = this.querySelector('#delay');
    if (delayInput) {
      delayInput.addEventListener('change', (e) => {
        this._config = { ...this._config, delay: parseInt(e.target.value) || 30 };
        this._dispatchChange();
      });
    }

    // Tab clicks
    const tabBar = this.querySelector('#tab-bar');
    if (tabBar) {
      tabBar.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (tab) {
          this._selectedCard = parseInt(tab.dataset.index);
          this._GUImode = true;
          this._guiModeAvailable = true;
          this.render();
        }
      });
    }

    // Add button
    const addBtn = this.querySelector('#add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._selectedCard = this._config.cards.length;
        this.render();
      });
    }

    // Card options
    const toggleMode = this.querySelector('#toggle-mode');
    if (toggleMode) {
      toggleMode.addEventListener('click', () => this._toggleMode());
    }

    const movePrev = this.querySelector('#move-prev');
    if (movePrev) {
      movePrev.addEventListener('click', () => this._handleMove(-1));
    }

    const moveNext = this.querySelector('#move-next');
    if (moveNext) {
      moveNext.addEventListener('click', () => this._handleMove(1));
    }

    const copyCard = this.querySelector('#copy-card');
    if (copyCard) {
      copyCard.addEventListener('click', () => this._handleCopyCard());
    }

    const cutCard = this.querySelector('#cut-card');
    if (cutCard) {
      cutCard.addEventListener('click', () => this._handleCutCard());
    }

    const deleteCard = this.querySelector('#delete-card');
    if (deleteCard) {
      deleteCard.addEventListener('click', () => this._handleDeleteCard());
    }
  }

  async _loadCardEditor(index) {
    const container = this.querySelector('#editor-container');
    if (!container) return;

    const cardConfig = this._config.cards[index];

    const editor = document.createElement('hui-card-element-editor');
    editor.hass = this._hass;
    editor.lovelace = this.lovelace;
    editor.value = cardConfig;

    editor.addEventListener('config-changed', (e) => {
      e.stopPropagation();
      const cards = [...this._config.cards];
      cards[this._selectedCard] = e.detail.config;
      this._config = { ...this._config, cards };
      this._guiModeAvailable = e.detail.guiModeAvailable !== false;
      this._dispatchChange();
    });

    editor.addEventListener('GUImode-changed', (e) => {
      e.stopPropagation();
      this._GUImode = e.detail.guiMode;
      this._guiModeAvailable = e.detail.guiModeAvailable !== false;
      this._updateModeButton();
    });

    container.appendChild(editor);
  }

  _loadCardPicker() {
    const container = this.querySelector('#picker-container');
    if (!container) return;

    const picker = document.createElement('hui-card-picker');
    picker.hass = this._hass;
    picker.lovelace = this.lovelace;

    picker.addEventListener('config-changed', (e) => {
      e.stopPropagation();
      const newCard = e.detail.config;
      const cards = [...this._config.cards, newCard];
      this._config = { ...this._config, cards };
      this._dispatchChange();
      this.render();
    });

    container.appendChild(picker);
  }

  _updateModeButton() {
    const btn = this.querySelector('#toggle-mode');
    if (!btn) return;

    btn.disabled = !this._guiModeAvailable;
    const path = this._GUImode
      ? 'M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19M12,15A1,1 0 0,1 13,16A1,1 0 0,1 12,17A1,1 0 0,1 11,16A1,1 0 0,1 12,15M8,15A1,1 0 0,1 9,16A1,1 0 0,1 8,17A1,1 0 0,1 7,16A1,1 0 0,1 8,15M16,15A1,1 0 0,1 17,16A1,1 0 0,1 16,17A1,1 0 0,1 15,16A1,1 0 0,1 16,15Z'
      : 'M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,20L1.5,16.5L2.91,15.09L5,17.17L9.59,12.59L11,14L5,20Z';
    btn.querySelector('path').setAttribute('d', path);
  }

  _toggleMode() {
    const editor = this.querySelector('hui-card-element-editor');
    if (editor && editor.toggleMode) {
      editor.toggleMode();
    }
  }

  _handleMove(direction) {
    const source = this._selectedCard;
    const target = source + direction;
    if (target < 0 || target >= this._config.cards.length) return;

    const cards = [...this._config.cards];
    const card = cards.splice(source, 1)[0];
    cards.splice(target, 0, card);

    this._config = { ...this._config, cards };
    this._selectedCard = target;
    this._dispatchChange();
    this.render();
  }

  _handleCopyCard() {
    this._clipboard = JSON.parse(JSON.stringify(this._config.cards[this._selectedCard]));
  }

  _handleCutCard() {
    this._handleCopyCard();
    this._handleDeleteCard();
  }

  _handleDeleteCard() {
    const cards = [...this._config.cards];
    cards.splice(this._selectedCard, 1);
    this._config = { ...this._config, cards };
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    this._dispatchChange();
    this.render();
  }

  _dispatchChange() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("periodic-card-reload-editor", PeriodicCardReloadEditor);

console.info(
  "%c PERIODIC-CARD-RELOAD %c Loaded ",
  "color: white; background: #3498db; font-weight: bold;",
  "color: #3498db; background: white; font-weight: bold;"
);
