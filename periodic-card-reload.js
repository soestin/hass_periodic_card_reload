class PeriodicCardReloadEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 0;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        label {
          font-weight: 500;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .description {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        input[type="number"] {
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
        }
      </style>
      <div class="editor">
        <div class="field">
          <label for="delay">Reload Interval (seconds)</label>
          <input
            type="number"
            id="delay"
            min="1"
            value="${this._config.delay || 30}"
          />
          <span class="description">How often child cards are reloaded.</span>
        </div>
      </div>
    `;

    this.shadowRoot.querySelector("#delay").addEventListener("input", (ev) => {
      const value = parseInt(ev.target.value, 10);
      if (value > 0) {
        this._config = { ...this._config, delay: value };
        this._fireChanged();
      }
    });
  }

  _fireChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("periodic-card-reload-editor", PeriodicCardReloadEditor);

class PeriodicCardReload extends HTMLElement {
  constructor() {
    super();
    this._cards = [];
    this._config = {};
    this._intervalId = null;
    this._helpers = null;
  }

  static getConfigElement() {
    return document.createElement("periodic-card-reload-editor");
  }

  static getStubConfig() {
    return { delay: 30, cards: [] };
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
    this._cards.forEach((card) => (card.hass = hass));
  }

  async _buildCard() {
    this._container = document.createElement("div");
    this.appendChild(this._container);
    await this._createCards();
    this._startInterval();
  }

  async _createCards() {
    this._cards = [];
    this._container.innerHTML = "";

    if (!this._helpers) {
      this._helpers = await window.loadCardHelpers();
    }

    for (const cardConfig of this._config.cards) {
      const card = await this._helpers.createCardElement(cardConfig);
      card.hass = this._hass;
      this._cards.push(card);
      this._container.appendChild(card);
    }
  }

  _startInterval() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
    this._intervalId = setInterval(() => this._createCards(), this._config.delay * 1000);
  }

  disconnectedCallback() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  getCardSize() {
    return this._cards.reduce((total, card) => {
      return total + (typeof card.getCardSize === "function" ? card.getCardSize() : 1);
    }, 0);
  }
}

customElements.define("periodic-card-reload", PeriodicCardReload);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "periodic-card-reload",
  name: "Periodic Card Reload",
  description: "A container that periodically reloads its child cards",
});

console.info(
  "%c PERIODIC-CARD-RELOAD %c Loaded ",
  "color: white; background: #3498db; font-weight: bold;",
  "color: #3498db; background: white; font-weight: bold;"
);
