/**
 * Commands Service — Handles system commands and mobile control
 * Detects user intent from messages and executes actions
 */

const { exec } = require('child_process');
const os = require('os');

class CommandService {
  constructor() {
    this.platform = os.platform();
    this.commandPatterns = [
      { pattern: /open (browser|chrome|firefox|edge)/i, action: 'openBrowser' },
      { pattern: /open (notepad|text editor)/i, action: 'openNotepad' },
      { pattern: /open (calculator|calc)/i, action: 'openCalculator' },
      { pattern: /what('?s| is) the time/i, action: 'getTime' },
      { pattern: /what('?s| is) the date/i, action: 'getDate' },
      { pattern: /battery (level|status|percentage)/i, action: 'getBattery' },
      { pattern: /system (info|information|status)/i, action: 'getSystemInfo' },
      { pattern: /search (for |)(.*)/i, action: 'webSearch' },
      { pattern: /remind me (to |about |)(.*)/i, action: 'setReminder' },
      { pattern: /remember (that |)(.*)/i, action: 'rememberNote' },
      { pattern: /what did i (tell|say|ask) you (to |about |)remember/i, action: 'recallNotes' },
      { pattern: /shutdown|shut down/i, action: 'shutdown' },
      { pattern: /restart|reboot/i, action: 'restart' },
      { pattern: /volume (up|down|mute)/i, action: 'adjustVolume' },
    ];
  }

  /**
   * Parse a message for commands
   */
  parseCommand(message) {
    for (const cmd of this.commandPatterns) {
      const match = message.match(cmd.pattern);
      if (match) {
        return { action: cmd.action, match, params: match.slice(1) };
      }
    }
    return null;
  }

  /**
   * Execute a detected command
   */
  async executeCommand(action, params = []) {
    switch (action) {
      case 'openBrowser':
        return this.runSystemCommand('start chrome || start msedge || start firefox');

      case 'openNotepad':
        return this.runSystemCommand('start notepad');

      case 'openCalculator':
        return this.runSystemCommand('start calc');

      case 'getTime':
        return { 
          success: true, 
          result: `It's currently ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        };

      case 'getDate':
        return { 
          success: true, 
          result: `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
        };

      case 'getSystemInfo':
        return {
          success: true,
          result: `System: ${os.type()} ${os.release()}\nCPU: ${os.cpus()[0].model}\nRAM: ${Math.round(os.totalmem() / (1024 ** 3))}GB total, ${Math.round(os.freemem() / (1024 ** 3))}GB free\nUptime: ${Math.round(os.uptime() / 3600)} hours`
        };

      case 'webSearch':
        const query = params[params.length - 1];
        if (query) {
          return this.runSystemCommand(`start "" "https://www.google.com/search?q=${encodeURIComponent(query)}"`);
        }
        return { success: false, result: 'What should I search for?' };

      case 'adjustVolume':
        const direction = params[0]?.toLowerCase();
        if (direction === 'mute') {
          return this.runSystemCommand('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
        }
        return { success: true, result: `Volume ${direction} — use your keyboard volume keys for now, boss.` };

      default:
        return { success: false, result: 'Command recognized but not implemented yet.' };
    }
  }

  /**
   * Run a system command (Windows)
   */
  runSystemCommand(command) {
    return new Promise((resolve) => {
      exec(command, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, result: `Command failed: ${error.message}` });
        } else {
          resolve({ success: true, result: stdout || 'Done!' });
        }
      });
    });
  }
}

module.exports = CommandService;
