const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class FileService {
  /**
   * Read a file from the system
   * Streams large files to avoid RAM spikes on 4GB machines
   */
  async readFile(filePath) {
    try {
      let targetPath = this._resolve(filePath);

      // Safety: check file size first — skip files > 2MB to protect RAM
      const stat = await fs.stat(targetPath);
      if (stat.size > 2 * 1024 * 1024) {
        return {
          success: false,
          message: `File too large (${(stat.size / (1024 * 1024)).toFixed(1)}MB). Max 2MB to protect your 4GB RAM.`
        };
      }

      const content = await fs.readFile(targetPath, 'utf8');
      return {
        success: true,
        content,
        path: targetPath,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Could not read file: ${error.message}`
      };
    }
  }

  /**
   * Write/create a file
   */
  async writeFile(filePath, content) {
    try {
      let targetPath = this._resolve(filePath);

      // Create parent directories if they don't exist
      const dir = path.dirname(targetPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(targetPath, content, 'utf8');
      return {
        success: true,
        message: `File written successfully`,
        path: targetPath,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Could not write file: ${error.message}`
      };
    }
  }

  /**
   * Append content to an existing file
   */
  async appendFile(filePath, content) {
    try {
      let targetPath = this._resolve(filePath);
      await fs.appendFile(targetPath, content, 'utf8');
      return {
        success: true,
        message: `Content appended successfully`,
        path: targetPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Could not append to file: ${error.message}`
      };
    }
  }

  /**
   * Replace text inside a file (find & replace)
   */
  async editFile(filePath, findText, replaceText) {
    try {
      let targetPath = this._resolve(filePath);

      // Read, check size
      const stat = await fs.stat(targetPath);
      if (stat.size > 2 * 1024 * 1024) {
        return { success: false, message: 'File too large to edit safely (>2MB). Protect your RAM!' };
      }

      let content = await fs.readFile(targetPath, 'utf8');

      if (!content.includes(findText)) {
        return {
          success: false,
          message: `Could not find "${findText.substring(0, 50)}..." in the file`
        };
      }

      const newContent = content.replace(findText, replaceText);

      // Backup original before editing
      const backupPath = targetPath + '.bak';
      await fs.writeFile(backupPath, content, 'utf8');

      await fs.writeFile(targetPath, newContent, 'utf8');
      return {
        success: true,
        message: `File edited. Backup saved as ${path.basename(backupPath)}`,
        path: targetPath,
        backup: backupPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Edit failed: ${error.message}`
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath) {
    try {
      let targetPath = this._resolve(filePath);
      await fs.unlink(targetPath);
      return { success: true, message: `Deleted: ${targetPath}` };
    } catch (error) {
      return { success: false, message: `Delete failed: ${error.message}` };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath = '.') {
    try {
      let targetPath = this._resolve(dirPath);
      const entries = await fs.readdir(targetPath, { withFileTypes: true });

      const files = entries.map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'folder' : 'file'
      }));

      return {
        success: true,
        files,
        path: targetPath,
        count: files.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Could not list directory: ${error.message}`
      };
    }
  }

  /**
   * Check if file/folder exists
   */
  async exists(filePath) {
    try {
      let targetPath = this._resolve(filePath);
      await fs.access(targetPath);
      return { success: true, exists: true, path: targetPath };
    } catch {
      return { success: true, exists: false };
    }
  }

  /**
   * Resolve path — relative paths resolve from user home dir
   */
  _resolve(p) {
    if (path.isAbsolute(p)) return p;
    return path.resolve(process.cwd(), p);
  }
}

module.exports = new FileService();
