const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class SystemService {
  constructor() {
    this.projectPath = path.resolve(__dirname, '..');
    this.downloadsPath = path.join(os.homedir(), 'Downloads', 'lunar-portable');
    this.isSyncing = false;
    this.watcher = null;
  }

  /**
   * Get system paths and current status
   */
  getSystemInfo() {
    return {
      projectPath: this.projectPath,
      downloadsPath: this.downloadsPath,
      isSyncing: this.isSyncing,
      os: os.platform(),
      nodeVersion: process.version
    };
  }

  /**
   * Sync changed files to the Downloads folder
   * We only sync code, not node_modules or models (too heavy)
   */
  async syncToDownloads() {
    return new Promise((resolve) => {
      if (!fs.existsSync(this.downloadsPath)) {
        try {
          fs.mkdirSync(this.downloadsPath, { recursive: true });
          fs.mkdirSync(path.join(this.downloadsPath, 'app'), { recursive: true });
        } catch (e) {
          return resolve({ success: false, message: 'Could not create Downloads folder' });
        }
      }

      const appPath = path.join(this.downloadsPath, 'app');
      
      // We use robocopy for fast, incremental sync on Windows
      // /MIR = Mirror (updates only changed files, deletes removed ones)
      // /XD = Exclude Directories
      const cmd = `robocopy "${this.projectPath}" "${appPath}" /S /XD node_modules .git .gemini models /NFL /NDL /NJH /NJS /R:1 /W:1`;
      
      exec(cmd, (err) => {
        // Robocopy return codes < 8 are success/warnings, >= 8 are errors
        if (err && err.code >= 8) {
          resolve({ success: false, message: `Sync failed with code ${err.code}` });
        } else {
          resolve({ success: true, message: 'Files synced to Downloads!' });
        }
      });
    });
  }

  /**
   * Start watching for file changes
   */
  startAutoSync(callback) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    console.log(`🌙 Auto-sync active: Watching ${this.projectPath}`);
    
    let debounceTimer;
    this.watcher = fs.watch(this.projectPath, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.includes('node_modules') && !filename.includes('lunar_memory.json')) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          console.log(`🔄 Change detected in ${filename}, syncing...`);
          await this.syncToDownloads();
          if (callback) callback(filename);
        }, 1000); // Wait 1s after last change to sync
      }
    });
  }

  stopAutoSync() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isSyncing = false;
  }

  /**
   * Create a Windows Desktop Shortcut
   */
  async createDesktopShortcut(iconPath = null) {
    return new Promise((resolve) => {
      const desktop = path.join(os.homedir(), 'Desktop');
      const shortcutPath = path.join(desktop, 'Lunar AI.lnk');
      const targetPath = path.join(this.projectPath, 'run_lunar.bat');
      const workingDir = this.projectPath;
      
      let iconLogic = '';
      if (iconPath && fs.existsSync(iconPath)) {
        iconLogic = `$s.IconLocation = "${iconPath}";`;
      } else {
        // Default icon if none provided (looks for lunar icon in public)
        const defaultIcon = path.join(this.projectPath, 'public', 'favicon.ico');
        if (fs.existsSync(defaultIcon)) {
           iconLogic = `$s.IconLocation = "${defaultIcon}";`;
        }
      }

      const psScript = `
        $w = New-Object -ComObject WScript.Shell;
        $s = $w.CreateShortcut("${shortcutPath}");
        $s.TargetPath = "${targetPath}";
        $s.WorkingDirectory = "${workingDir}";
        $s.Description = "Start Lunar AI Assistant";
        ${iconLogic}
        $s.Save();
      `;

      exec(`powershell -command "${psScript.replace(/\n/g, '')}"`, (err) => {
        if (err) {
          resolve({ success: false, message: err.message });
        } else {
          resolve({ success: true, message: 'Shortcut created on Desktop!' });
        }
      });
    });
  }
}

module.exports = new SystemService();
