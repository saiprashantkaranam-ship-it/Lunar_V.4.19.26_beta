const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const KEYS_FILE = path.join(__dirname, '..', 'lunar_api_keys.json');

class ApiKeyService {
  constructor() {
    this.keys = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(KEYS_FILE)) {
        return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
      }
    } catch (e) {}
    return {};
  }

  _save() {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(this.keys, null, 2), 'utf8');
  }

  /**
   * Generate a new API key
   * @param {string} label — friendly name like "my-app" or "phone"
   */
  generate(label = 'default') {
    const key = 'lunar_' + crypto.randomBytes(24).toString('hex');
    this.keys[key] = {
      label,
      created: new Date().toISOString(),
      lastUsed: null,
      requests: 0
    };
    this._save();
    return { key, label };
  }

  /**
   * Validate an API key, returns true/false
   */
  validate(key) {
    if (!key || !this.keys[key]) return false;
    this.keys[key].lastUsed = new Date().toISOString();
    this.keys[key].requests++;
    this._save();
    return true;
  }

  /**
   * List all keys (masked for safety)
   */
  listKeys() {
    return Object.entries(this.keys).map(([key, info]) => ({
      key: key.substring(0, 12) + '...' + key.slice(-6),
      fullKey: key,
      label: info.label,
      created: info.created,
      lastUsed: info.lastUsed,
      requests: info.requests
    }));
  }

  /**
   * Revoke/delete a key
   */
  revoke(key) {
    if (this.keys[key]) {
      delete this.keys[key];
      this._save();
      return { success: true, message: 'Key revoked' };
    }
    return { success: false, message: 'Key not found' };
  }
}

module.exports = new ApiKeyService();
