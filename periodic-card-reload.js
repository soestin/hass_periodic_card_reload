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

// Visual Editor
class PeriodicCardReloadEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  render() {
    if (!this._container) {
      this._container = document.createElement("div");
      this._container.style.padding = "16px";
      this.appendChild(this._container);
    }

    this._container.innerHTML = `
      <style>
        .editor-row {
          margin-bottom: 16px;
        }
        .editor-row label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .editor-row input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
        }
        .editor-row textarea {
          width: 100%;
          min-height: 200px;
          padding: 8px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
        }
        .editor-row small {
          color: var(--secondary-text-color, #666);
        }
      </style>
      <div class="editor-row">
        <label>Reload Delay (seconds)</label>
        <input type="number" id="delay" min="1" value="${this._config.delay || 30}">
        <small>How often to reload the cards</small>
      </div>
      <div class="editor-row">
        <label>Cards (YAML)</label>
        <textarea id="cards">${this._cardsToYaml(this._config.cards || [])}</textarea>
        <small>Define your cards in YAML format</small>
      </div>
    `;

    this._container.querySelector("#delay").addEventListener("change", (e) => {
      this._config.delay = parseInt(e.target.value) || 30;
      this._dispatchChange();
    });

    this._container.querySelector("#cards").addEventListener("change", (e) => {
      try {
        const cards = this._yamlToCards(e.target.value);
        this._config.cards = cards;
        this._dispatchChange();
      } catch (err) {
        // Invalid YAML, don't update
      }
    });
  }

  _cardsToYaml(cards) {
    if (!cards || cards.length === 0) return "";
    return cards.map(card => {
      return Object.entries(card)
        .map(([key, value]) => {
          if (typeof value === "object") {
            return `${key}: ${JSON.stringify(value)}`;
          }
          return `${key}: ${value}`;
        })
        .join("\n");
    }).join("\n---\n");
  }

  _yamlToCards(yaml) {
    if (!yaml.trim()) return [];

    // Simple YAML parser for basic card configs
    const cardStrings = yaml.split(/\n---\n/);
    return cardStrings.map(cardStr => {
      const card = {};
      const lines = cardStr.trim().split("\n");
      lines.forEach(line => {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          try {
            card[key] = JSON.parse(value);
          } catch {
            card[key] = value;
          }
        }
      });
      return card;
    }).filter(card => Object.keys(card).length > 0);
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
