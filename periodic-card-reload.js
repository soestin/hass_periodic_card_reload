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

// Visual Editor - Similar to vertical-stack
class PeriodicCardReloadEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._helpers = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._subElementEditor) {
      this._subElementEditor.hass = hass;
    }
  }

  setConfig(config) {
    this._config = { ...config };
    this._config.cards = this._config.cards || [];
    this.render();
  }

  async render() {
    if (!this._helpers) {
      this._helpers = await window.loadCardHelpers();
    }

    this.innerHTML = `
      <style>
        .card-config {
          padding: 16px;
        }
        .delay-input {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .delay-input label {
          min-width: 140px;
        }
        .delay-input input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: var(--input-fill-color, var(--secondary-background-color));
          color: var(--primary-text-color);
        }
        .cards-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .cards-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .add-card-btn {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
        }
        .add-card-btn:hover {
          opacity: 0.9;
        }
        .cards-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .card-item {
          display: flex;
          align-items: center;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 8px;
          padding: 12px;
          gap: 12px;
        }
        .card-item-info {
          flex: 1;
          overflow: hidden;
        }
        .card-item-type {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-item-actions {
          display: flex;
          gap: 4px;
        }
        .card-item-actions button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-item-actions button:hover {
          background: var(--divider-color, rgba(0,0,0,0.1));
        }
        .card-item-actions button svg {
          width: 20px;
          height: 20px;
        }
        .empty-state {
          text-align: center;
          padding: 32px;
          color: var(--secondary-text-color);
        }
        .sub-editor {
          margin-top: 16px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
        }
        .sub-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--secondary-background-color);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .sub-editor-header h4 {
          margin: 0;
        }
        .sub-editor-content {
          padding: 16px;
        }
        .back-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--primary-color);
        }
      </style>
      <div class="card-config">
        <div class="delay-input">
          <label>Reload delay (seconds)</label>
          <input type="number" id="delay" min="1" value="${this._config.delay || 30}">
        </div>
        <div class="cards-header">
          <h3>Cards</h3>
          <button class="add-card-btn" id="add-card">+ Add Card</button>
        </div>
        <div class="cards-list" id="cards-list">
          ${this._renderCardsList()}
        </div>
        <div id="sub-editor-container"></div>
      </div>
    `;

    this._bindEvents();
  }

  _renderCardsList() {
    if (!this._config.cards || this._config.cards.length === 0) {
      return '<div class="empty-state">No cards configured. Click "Add Card" to get started.</div>';
    }

    return this._config.cards.map((card, index) => `
      <div class="card-item" data-index="${index}">
        <div class="card-item-info">
          <div class="card-item-type">${card.type || 'Unknown card'}</div>
        </div>
        <div class="card-item-actions">
          <button class="move-up" title="Move up" ${index === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/></svg>
          </button>
          <button class="move-down" title="Move down" ${index === this._config.cards.length - 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>
          </button>
          <button class="edit-card" title="Edit">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
          </button>
          <button class="delete-card" title="Delete">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  _bindEvents() {
    // Delay input
    this.querySelector('#delay').addEventListener('change', (e) => {
      this._config.delay = parseInt(e.target.value) || 30;
      this._dispatchChange();
    });

    // Add card button
    this.querySelector('#add-card').addEventListener('click', () => {
      this._showCardPicker();
    });

    // Card item actions
    this.querySelector('#cards-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const cardItem = btn.closest('.card-item');
      if (!cardItem) return;

      const index = parseInt(cardItem.dataset.index);

      if (btn.classList.contains('move-up')) {
        this._moveCard(index, index - 1);
      } else if (btn.classList.contains('move-down')) {
        this._moveCard(index, index + 1);
      } else if (btn.classList.contains('edit-card')) {
        this._editCard(index);
      } else if (btn.classList.contains('delete-card')) {
        this._deleteCard(index);
      }
    });
  }

  async _showCardPicker() {
    const container = this.querySelector('#sub-editor-container');

    container.innerHTML = `
      <div class="sub-editor">
        <div class="sub-editor-header">
          <button class="back-btn" id="back-btn">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
            Back
          </button>
          <h4>Add Card</h4>
          <div></div>
        </div>
        <div class="sub-editor-content" id="picker-content"></div>
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => {
      container.innerHTML = '';
    });

    const pickerContent = container.querySelector('#picker-content');
    const cardPicker = document.createElement('hui-card-picker');
    cardPicker.hass = this._hass;
    cardPicker.addEventListener('config-changed', (e) => {
      const newCard = e.detail.config;
      this._config.cards = [...this._config.cards, newCard];
      this._dispatchChange();
      container.innerHTML = '';
      this.querySelector('#cards-list').innerHTML = this._renderCardsList();
      this._bindCardEvents();
    });
    pickerContent.appendChild(cardPicker);
  }

  async _editCard(index) {
    const container = this.querySelector('#sub-editor-container');
    const cardConfig = this._config.cards[index];

    container.innerHTML = `
      <div class="sub-editor">
        <div class="sub-editor-header">
          <button class="back-btn" id="back-btn">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
            Back
          </button>
          <h4>Edit ${cardConfig.type || 'Card'}</h4>
          <div></div>
        </div>
        <div class="sub-editor-content" id="editor-content"></div>
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => {
      container.innerHTML = '';
    });

    const editorContent = container.querySelector('#editor-content');

    try {
      const cardElement = await this._helpers.createCardElement(cardConfig);
      cardElement.hass = this._hass;

      let editor;
      if (cardElement.constructor.getConfigElement) {
        editor = cardElement.constructor.getConfigElement();
      }

      if (!editor) {
        editor = document.createElement('hui-card-element-editor');
      }

      editor.hass = this._hass;
      editor.setConfig(cardConfig);
      editor.addEventListener('config-changed', (e) => {
        this._config.cards[index] = e.detail.config;
        this._dispatchChange();
        this.querySelector('#cards-list').innerHTML = this._renderCardsList();
        this._bindCardEvents();
      });

      editorContent.appendChild(editor);
      this._subElementEditor = editor;
    } catch (err) {
      editorContent.innerHTML = `<p>Unable to load editor for this card type. Use YAML mode instead.</p>`;
    }
  }

  _bindCardEvents() {
    this.querySelector('#cards-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const cardItem = btn.closest('.card-item');
      if (!cardItem) return;

      const index = parseInt(cardItem.dataset.index);

      if (btn.classList.contains('move-up')) {
        this._moveCard(index, index - 1);
      } else if (btn.classList.contains('move-down')) {
        this._moveCard(index, index + 1);
      } else if (btn.classList.contains('edit-card')) {
        this._editCard(index);
      } else if (btn.classList.contains('delete-card')) {
        this._deleteCard(index);
      }
    });
  }

  _moveCard(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= this._config.cards.length) return;

    const cards = [...this._config.cards];
    const [moved] = cards.splice(fromIndex, 1);
    cards.splice(toIndex, 0, moved);

    this._config.cards = cards;
    this._dispatchChange();
    this.querySelector('#cards-list').innerHTML = this._renderCardsList();
    this._bindCardEvents();
  }

  _deleteCard(index) {
    this._config.cards = this._config.cards.filter((_, i) => i !== index);
    this._dispatchChange();
    this.querySelector('#cards-list').innerHTML = this._renderCardsList();
    this._bindCardEvents();
    this.querySelector('#sub-editor-container').innerHTML = '';
  }

  _dispatchChange() {
    const event = new CustomEvent("config-changed", {
      detail: { config: { ...this._config } },
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
