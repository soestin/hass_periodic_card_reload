class PeriodicCardReload extends HTMLElement {
  constructor() {
    super();
    this._cards = [];
    this._config = {};
    this._intervalId = null;
    this._helpers = null;
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
