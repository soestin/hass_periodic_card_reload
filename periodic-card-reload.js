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

console.info(
  "%c PERIODIC-CARD-RELOAD %c Loaded ",
  "color: white; background: #3498db; font-weight: bold;",
  "color: #3498db; background: white; font-weight: bold;"
);
