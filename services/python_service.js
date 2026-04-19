const { exec } = require('child_process');
const path = require('path');

class PythonService {
  constructor() {
    this.scriptPath = path.join(__dirname, 'python_bridge.py');
  }

  runPythonCommand(cmd, args = []) {
    return new Promise((resolve) => {
      const argsString = args.map(a => `"${a}"`).join(' ');
      const command = `python "${this.scriptPath}" ${cmd} ${argsString}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Python error: ${error.message}`);
          resolve({ success: false, message: error.message });
          return;
        }
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          console.error(`Failed to parse Python output: ${stdout}`);
          resolve({ success: false, message: 'Invalid response from Python' });
        }
      });
    });
  }

  async openYoutube(query) {
    return await this.runPythonCommand('open_youtube', query ? [query] : []);
  }

  async openApp(appName) {
    return await this.runPythonCommand('open_app', [appName]);
  }

  async getSpeedStats() {
    return await this.runPythonCommand('speed_check');
  }
}

module.exports = new PythonService();
