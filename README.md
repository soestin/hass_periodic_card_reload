# Periodic Card Reload

A simple Home Assistant Lovelace card that wraps other cards and periodically reloads them.

## Installation

### HACS (Recommended)

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
