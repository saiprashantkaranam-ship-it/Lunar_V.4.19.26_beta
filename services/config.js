/**
 * Lunar Config Service
 * Saves persistent settings to disk (lunar_config.json)
 */
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'lunar_config.json');

const DEFAULTS = {
  autoOpenBrowser: true,    // Open browser automatically on start
  model: 'deepseek-r1:1.5b' // Default AI model
};

class ConfigService {
  constructor() {
    this.config = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        // Merge with defaults so new keys always exist
        return { ...DEFAULTS, ...raw };
      }
    } catch (e) {}
    return { ...DEFAULTS };
  }

  _save() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this._save();
    return this.config;
  }

  getAll() {
    return { ...this.config };
  }

  update(updates) {
    this.config = { ...this.config, ...updates };
    this._save();
    return this.config;
  }
}

module.exports = new ConfigService();
