# Periodic Card Reload

A simple Home Assistant Lovelace card that wraps other cards and periodically reloads them.

![Example](https://github.com/soestin/hass_periodic_card_reload/raw/main/images/example.png)

## Installation

### HACS (Recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=soestin&repository=hass_periodic_card_reload&category=plugin)

Or manually:

1. Open HACS in Home Assistant
2. Go to "Frontend"
3. Click the three dots menu and select "Custom repositories"
4. Add this repository URL with category "Lovelace"
5. Install "Periodic Card Reload"
6. Restart Home Assistant

### Manual

1. Download `periodic-card-reload.js` from this repository
2. Copy it to your `config/www/` folder
3. Add the resource in your dashboard:
   - Go to Settings > Dashboards > Resources
   - Add `/local/periodic-card-reload.js` as JavaScript Module

## Usage

```yaml
type: custom:periodic-card-reload
delay: 60  # Reload interval in seconds (default: 30)
cards:
  - type: entities
    entities:
      - sensor.temperature
  - type: weather-forecast
    entity: weather.home
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delay` | number | 30 | Reload interval in seconds |
| `cards` | list | required | List of cards to wrap and reload |

## License

MIT
