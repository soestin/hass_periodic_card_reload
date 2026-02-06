class PeriodicCardReloadEditor extends HTMLElement {
  static get styles() {
    return `
      :host { display: block; }
      .editor { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; }
      .field { display: flex; flex-direction: column; gap: 4px; }
      label { font-weight: 500; font-size: 14px; color: var(--primary-text-color); }
      .hint { font-size: 12px; color: var(--secondary-text-color); }
      input[type="number"] {
        padding: 8px; border: 1px solid var(--divider-color, #ccc); border-radius: 4px;
        background: var(--card-background-color, #fff); color: var(--primary-text-color); font-size: 14px;
      }
      .header { display: flex; align-items: center; justify-content: space-between; }
      .header h3 { margin: 0; font-size: 16px; color: var(--primary-text-color); }
      .card-list { display: flex; flex-direction: column; gap: 4px; }
      .card-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 12px; border-radius: 8px;
        background: var(--secondary-background-color, #f5f5f5);
      }
      .card-type { font-size: 14px; color: var(--primary-text-color); font-weight: 500; }
      .actions { display: flex; gap: 4px; }
      .actions button {
        background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px;
        color: var(--secondary-text-color); font-size: 14px; line-height: 1;
      }
      .actions button:hover { background: var(--divider-color, #ddd); color: var(--primary-text-color); }
      .actions button:disabled { opacity: 0.3; cursor: default; }
      .actions button:disabled:hover { background: none; color: var(--secondary-text-color); }
      .actions button.danger:hover { color: var(--error-color, #db4437); }
      .empty { padding: 16px; text-align: center; color: var(--secondary-text-color); font-size: 14px; }
      .add-btn {
        padding: 8px; border: 2px dashed var(--divider-color, #ccc); border-radius: 8px;
        background: none; cursor: pointer; color: var(--primary-color, #03a9f4);
        font-size: 14px; font-weight: 500;
      }
      .add-btn:hover { background: var(--secondary-background-color, #f5f5f5); }
      .back-btn {
        background: none; border: none; cursor: pointer; padding: 4px 0;
        color: var(--primary-color, #03a9f4); font-size: 14px; font-weight: 500;
      }
      .toolbar { display: flex; align-items: center; gap: 12px; }
      .toolbar h3 { margin: 0; font-size: 16px; color: var(--primary-text-color); }
      #sub-editor { min-height: 48px; }
    `;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._selectedCard = null;
    this._subEditor = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._subEditor) this._subEditor.hass = hass;
    const picker = this.shadowRoot.querySelector("hui-card-picker");
    if (picker) picker.hass = hass;
  }

  setConfig(config) {
    this._config = { ...config, cards: [...(config.cards || [])] };
    this._selectedCard = null;
    this._subEditor = null;
    this._render();
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

  _render() {
    if (this._selectedCard === "picker") {
      this._renderPicker();
    } else if (this._selectedCard !== null) {
      this._renderCardEditor();
    } else {
      this._renderMain();
    }
  }

  _renderMain() {
    const cards = this._config.cards || [];
    this.shadowRoot.innerHTML = `
      <style>${PeriodicCardReloadEditor.styles}</style>
      <div class="editor">
        <div class="field">
          <label for="delay">Reload Interval (seconds)</label>
          <input type="number" id="delay" min="1" value="${this._config.delay || 30}" />
          <span class="hint">How often child cards are reloaded.</span>
        </div>
        <div class="header"><h3>Cards</h3></div>
        <div class="card-list">
          ${cards.length === 0 ? '<div class="empty">No cards added yet.</div>' : ""}
          ${cards
            .map(
              (c, i) => `
            <div class="card-row">
              <span class="card-type">${c.type || "unknown"}</span>
              <div class="actions">
                <button data-a="up" data-i="${i}" ${i === 0 ? "disabled" : ""} title="Move up">&#9650;</button>
                <button data-a="down" data-i="${i}" ${i === cards.length - 1 ? "disabled" : ""} title="Move down">&#9660;</button>
                <button data-a="edit" data-i="${i}" title="Edit">&#9998;</button>
                <button data-a="delete" data-i="${i}" class="danger" title="Delete">&#10005;</button>
              </div>
            </div>`
            )
            .join("")}
        </div>
        <button class="add-btn" id="add">+ Add Card</button>
      </div>
    `;

    this.shadowRoot.querySelector("#delay").addEventListener("input", (ev) => {
      const v = parseInt(ev.target.value, 10);
      if (v > 0) {
        this._config = { ...this._config, delay: v };
        this._fireChanged();
      }
    });

    this.shadowRoot.querySelectorAll("[data-a]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.i, 10);
        const cards = [...this._config.cards];
        switch (btn.dataset.a) {
          case "up":
            [cards[i], cards[i - 1]] = [cards[i - 1], cards[i]];
            this._config = { ...this._config, cards };
            this._fireChanged();
            this._renderMain();
            break;
          case "down":
            [cards[i], cards[i + 1]] = [cards[i + 1], cards[i]];
            this._config = { ...this._config, cards };
            this._fireChanged();
            this._renderMain();
            break;
          case "edit":
            this._selectedCard = i;
            this._renderCardEditor();
            break;
          case "delete":
            cards.splice(i, 1);
            this._config = { ...this._config, cards };
            this._fireChanged();
            this._renderMain();
            break;
        }
      })
    );

    this.shadowRoot.querySelector("#add").addEventListener("click", () => {
      this._selectedCard = "picker";
      this._renderPicker();
    });
  }

  async _renderPicker() {
    this.shadowRoot.innerHTML = `
      <style>${PeriodicCardReloadEditor.styles}</style>
      <div class="editor">
        <button class="back-btn" id="back">&#8592; Back</button>
        <div id="picker"></div>
      </div>
    `;

    this.shadowRoot.querySelector("#back").addEventListener("click", () => {
      this._selectedCard = null;
      this._render();
    });

    await window.loadCardHelpers();
    const picker = document.createElement("hui-card-picker");
    picker.hass = this._hass;
    picker.addEventListener("config-changed", (ev) => {
      ev.stopPropagation();
      const cards = [...this._config.cards, ev.detail.config];
      this._config = { ...this._config, cards };
      this._fireChanged();
      this._selectedCard = cards.length - 1;
      this._renderCardEditor();
    });
    this.shadowRoot.querySelector("#picker").appendChild(picker);
  }

  async _renderCardEditor() {
    const i = this._selectedCard;
    const cardConfig = this._config.cards[i];

    this.shadowRoot.innerHTML = `
      <style>${PeriodicCardReloadEditor.styles}</style>
      <div class="editor">
        <div class="toolbar">
          <button class="back-btn" id="back">&#8592; Back</button>
          <h3>${cardConfig.type || "Card"}</h3>
        </div>
        <div id="sub-editor"></div>
      </div>
    `;

    this.shadowRoot.querySelector("#back").addEventListener("click", () => {
      this._selectedCard = null;
      this._subEditor = null;
      this._render();
    });

    const container = this.shadowRoot.querySelector("#sub-editor");

    if (cardConfig.type) {
      const tag = cardConfig.type.startsWith("custom:")
        ? cardConfig.type.substr(7)
        : `hui-${cardConfig.type}-card`;

      try {
        await Promise.race([
          customElements.whenDefined(tag),
          new Promise((_, r) => setTimeout(() => r(), 3000)),
        ]);
        const cls = customElements.get(tag);
        if (cls && cls.getConfigElement) {
          const editor = await cls.getConfigElement();
          editor.hass = this._hass;
          editor.setConfig(cardConfig);
          editor.addEventListener("config-changed", (ev) => {
            ev.stopPropagation();
            const cards = [...this._config.cards];
            cards[i] = ev.detail.config;
            this._config = { ...this._config, cards };
            this._fireChanged();
          });
          this._subEditor = editor;
          container.appendChild(editor);
          return;
        }
      } catch (_) {
        /* no editor available */
      }
    }

    container.innerHTML =
      '<div class="hint">No visual editor for this card type. Use the code editor instead.</div>';
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
