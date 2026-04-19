/**
 * 🌙 Lunar AI — Main Server
 * Your laptop is the brain. No paid APIs. 100% yours.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const OllamaService = require('./services/ollama');
const MemoryService = require('./services/memory');
const CommandService = require('./services/commands');
const pythonService = require('./services/python_service');
const fileService = require('./services/file_service');
const apiKeys = require('./services/api_keys');
const config = require('./services/config');
const system = require('./services/system');

// ─── Configuration ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 5e6 // 5MB — safe for 4GB RAM laptop
});

// ─── Services ────────────────────────────────────────────
const ollama = new OllamaService(config.get('model'));
const memory = new MemoryService();
const commands = new CommandService();

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── REST API Routes ─────────────────────────────────────

// Health check + Ollama status
app.get('/api/health', async (req, res) => {
  const ollamaStatus = await ollama.checkHealth();
  const stats = memory.getStats();
  res.json({
    status: 'Lunar is alive 🌙',
    ollama: ollamaStatus,
    memory: stats,
    uptime: Math.round(process.uptime()),
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      cpus: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / (1024 ** 3))}GB`,
      freeMemory: `${Math.round(os.freemem() / (1024 ** 3))}GB`
    }
  });
});

// Model Management
app.get('/api/models', async (req, res) => {
  const status = await ollama.checkHealth();
  res.json(status);
});

app.post('/api/models/set', async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model name required' });
  
  // Update both the running service and the persistent config
  const result = ollama.setModel(model);
  config.set('model', model);
  
  res.json(result);
});

app.post('/api/models/pull', async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model name required' });
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  try {
    await ollama.pullModel(model, (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ status: 'success' })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ status: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// File Management
app.get('/api/files/read', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Path required' });
  const result = await fileService.readFile(path);
  res.json(result);
});

app.post('/api/files/write', async (req, res) => {
  const { path, content } = req.body;
  if (!path || content === undefined) return res.status(400).json({ error: 'Path and content required' });
  const result = await fileService.writeFile(path, content);
  res.json(result);
});

app.post('/api/files/edit', async (req, res) => {
  const { path, find, replace } = req.body;
  if (!path || !find) return res.status(400).json({ error: 'Path, find, and replace required' });
  const result = await fileService.editFile(path, find, replace || '');
  res.json(result);
});

app.post('/api/files/append', async (req, res) => {
  const { path, content } = req.body;
  if (!path || !content) return res.status(400).json({ error: 'Path and content required' });
  const result = await fileService.appendFile(path, content);
  res.json(result);
});

app.get('/api/files/list', async (req, res) => {
  const result = await fileService.listFiles(req.query.path || '.');
  res.json(result);
});

app.post('/api/files/delete', async (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Path required' });
  const result = await fileService.deleteFile(path);
  res.json(result);
});

// ─── API Key Management ─────────────────────────────────
app.post('/api/keys/generate', (req, res) => {
  const { label } = req.body;
  const result = apiKeys.generate(label || 'default');
  res.json(result);
});

app.get('/api/keys', (req, res) => {
  res.json(apiKeys.listKeys());
});

app.post('/api/keys/revoke', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Key required' });
  res.json(apiKeys.revoke(key));
});

// ─── System & Management ────────────────────────────────
app.get('/api/system/info', (req, res) => {
  res.json(system.getSystemInfo());
});

app.post('/api/system/shortcut', async (req, res) => {
  const { iconPath } = req.body;
  const result = await system.createDesktopShortcut(iconPath);
  res.json(result);
});

app.post('/api/system/sync/toggle', (req, res) => {
  const { enabled } = req.body;
  if (enabled) {
    system.startAutoSync((file) => {
      io.emit('system_event', { type: 'sync', message: `Synced: ${file}` });
    });
  } else {
    system.stopAutoSync();
  }
  res.json({ enabled: system.isSyncing });
});

app.post('/api/system/sync/now', async (req, res) => {
  const result = await system.syncToDownloads();
  res.json(result);
});

// ─── Protected API Endpoint (use your generated keys here) ──
app.post('/api/lunar', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const key = authHeader.replace('Bearer ', '').trim();

  if (!apiKeys.validate(key)) {
    return res.status(401).json({ error: 'Invalid API key. Generate one from Lunar settings.' });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const response = await ollama.generateResponse(message);
    res.json({ response, model: ollama.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebSocket (Real-time) ───────────────────────────────
const activeConversations = new Map(); // socketId -> conversationId

io.on('connection', (socket) => {
  console.log(`🌙 Client connected: ${socket.id}`);

  // Create a new conversation for this session
  const conversationId = memory.createConversation(`Session ${new Date().toLocaleDateString()}`);
  activeConversations.set(socket.id, conversationId);

  socket.emit('connected', {
    message: 'Connected to Lunar AI 🌙',
    conversationId,
    sessionId: socket.id
  });

  // ─── Handle incoming messages ──────────────────────────
  socket.on('message', async (data) => {
    const { text, source = 'text' } = data;
    
    if (!text || !text.trim()) return;

    const convId = activeConversations.get(socket.id);
    memory.saveMessage(convId, 'user', text, source);

    // 1. Python-boosted YouTube
    const youtubeMatch = text.match(/open youtube(?: for | )(.*)/i);
    if (youtubeMatch) {
      socket.emit('thinking', { status: 'Launching YouTube via Python...' });
      const result = await pythonService.openYoutube(youtubeMatch[1]);
      const response = result.success ? "Done, boss. YouTube is up." : "Failed to open YouTube.";
      socket.emit('response', { text: response, source: 'python', done: true });
      memory.saveMessage(convId, 'assistant', response, 'python');
      return;
    }

    // 2. File Reading
    const readMatch = text.match(/read file (.*)/i);
    if (readMatch) {
      socket.emit('thinking', { status: 'Reading file...' });
      const result = await fileService.readFile(readMatch[1].trim());
      if (result.success) {
        const snippet = result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '');
        const response = `Here's what's in it, boss:\n\n\`\`\`\n${snippet}\n\`\`\``;
        socket.emit('response', { text: response, source: 'file', done: true });
        memory.saveMessage(convId, 'assistant', response, 'file');
      } else {
        socket.emit('response', { text: `Couldn't read it: ${result.message}`, source: 'error', done: true });
      }
      return;
    }

    // 3. File Editing (find & replace)
    // Format: "edit file <path> replace <old> with <new>"
    const editMatch = text.match(/edit file (.+?) replace (.+?) with (.+)/i);
    if (editMatch) {
      socket.emit('thinking', { status: 'Editing file...' });
      const result = await fileService.editFile(editMatch[1].trim(), editMatch[2].trim(), editMatch[3].trim());
      const response = result.success ? `Done, boss. ${result.message}` : `Edit failed: ${result.message}`;
      socket.emit('response', { text: response, source: 'file', done: true });
      memory.saveMessage(convId, 'assistant', response, 'file');
      return;
    }

    // 4. File Writing / Creating
    // Format: "write file <path> content <text>"  or  "create file <path> content <text>"
    const writeMatch = text.match(/(?:write|create) file (.+?) content ([\s\S]+)/i);
    if (writeMatch) {
      socket.emit('thinking', { status: 'Writing file...' });
      const result = await fileService.writeFile(writeMatch[1].trim(), writeMatch[2].trim());
      const response = result.success ? `Done, boss. File created at ${result.path}` : `Write failed: ${result.message}`;
      socket.emit('response', { text: response, source: 'file', done: true });
      memory.saveMessage(convId, 'assistant', response, 'file');
      return;
    }

    // 5. File Append
    // Format: "append to file <path> content <text>"
    const appendMatch = text.match(/append (?:to )?file (.+?) content ([\s\S]+)/i);
    if (appendMatch) {
      socket.emit('thinking', { status: 'Appending to file...' });
      const result = await fileService.appendFile(appendMatch[1].trim(), appendMatch[2].trim());
      const response = result.success ? `Done, boss. Content added.` : `Append failed: ${result.message}`;
      socket.emit('response', { text: response, source: 'file', done: true });
      memory.saveMessage(convId, 'assistant', response, 'file');
      return;
    }

    // 6. List files
    const listMatch = text.match(/list files(?: in)? ?(.*)/i);
    if (listMatch) {
      socket.emit('thinking', { status: 'Listing files...' });
      const dirPath = listMatch[1]?.trim() || '.';
      const result = await fileService.listFiles(dirPath);
      if (result.success) {
        const listing = result.files.map(f => `${f.type === 'folder' ? '📁' : '📄'} ${f.name}`).join('\n');
        const response = `Found ${result.count} items in ${result.path}:\n\n${listing}`;
        socket.emit('response', { text: response, source: 'file', done: true });
        memory.saveMessage(convId, 'assistant', response, 'file');
      } else {
        socket.emit('response', { text: `Can't list: ${result.message}`, source: 'error', done: true });
      }
      return;
    }

    // 7. Delete file
    const deleteMatch = text.match(/delete file (.*)/i);
    if (deleteMatch) {
      socket.emit('thinking', { status: 'Deleting file...' });
      const result = await fileService.deleteFile(deleteMatch[1].trim());
      const response = result.success ? `Done, boss. ${result.message}` : `Delete failed: ${result.message}`;
      socket.emit('response', { text: response, source: 'file', done: true });
      memory.saveMessage(convId, 'assistant', response, 'file');
      return;
    }

    // 8. Generate API key
    const keyMatch = text.match(/generate (?:an? )?(?:api )?key(?: (?:for|named|called) (.+))?/i);
    if (keyMatch) {
      const label = keyMatch[1]?.trim() || 'default';
      const result = apiKeys.generate(label);
      const response = `Done, boss! Here's your API key (label: "${result.label}"):\n\n🔑 ${result.key}\n\nUse it like:\ncurl -X POST http://localhost:3000/api/lunar -H "Authorization: Bearer ${result.key}" -H "Content-Type: application/json" -d '{"message": "hello"}'`;
      socket.emit('response', { text: response, source: 'system', done: true });
      memory.saveMessage(convId, 'assistant', response, 'system');
      return;
    }

    // 9. List API keys
    const listKeysMatch = text.match(/(?:list|show|my) (?:api )?keys/i);
    if (listKeysMatch) {
      const keys = apiKeys.listKeys();
      if (keys.length === 0) {
        const response = 'No API keys yet, boss. Say "generate a key" to make one.';
        socket.emit('response', { text: response, source: 'system', done: true });
      } else {
        const listing = keys.map(k => `🔑 ${k.key} — "${k.label}" (${k.requests} requests)`).join('\n');
        const response = `Your API keys, boss:\n\n${listing}`;
        socket.emit('response', { text: response, source: 'system', done: true });
      }
      memory.saveMessage(convId, 'assistant', 'Listed API keys', 'system');
      return;
    }

    // 10. Regular system commands
    const command = commands.parseCommand(text);
    if (command) {
      socket.emit('thinking', { status: 'Executing command...' });
      const result = await commands.executeCommand(command.action, command.params);
      
      if (result.success && result.result !== 'Done!') {
        const response = result.result;
        memory.saveMessage(convId, 'assistant', response, 'command');
        socket.emit('response', { text: response, source: 'command', done: true });
        return;
      }
    }

    // 9. AI response with streaming (fallback)
    socket.emit('thinking', { status: 'Lunar is thinking...' });

    try {
      const history = memory.getConversationHistory(convId, 6);
      const response = await ollama.generateResponse(text, history, (chunk) => {
        socket.emit('response_chunk', { text: chunk });
      });

      memory.saveMessage(convId, 'assistant', response, 'ai');
      socket.emit('response', { text: response, source: 'ai', done: true });

    } catch (error) {
      console.error('Ollama error:', error.message);
      socket.emit('response', { text: `Issue, boss: ${error.message}`, source: 'error', done: true });
    }
  });


  // ─── Handle disconnect ────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`🌙 Client disconnected: ${socket.id}`);
    activeConversations.delete(socket.id);
  });
});

// ─── Start Server ────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  // Get local IP for mobile access
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIP = addr.address;
        break;
      }
    }
  }

  console.log('');
  console.log('  🌙 ═══════════════════════════════════════════');
  console.log('  🌙  LUNAR AI — Your Personal AI Assistant');
  console.log('  🌙 ═══════════════════════════════════════════');
  console.log('');
  console.log(`  💻 Laptop:  http://localhost:${PORT}`);
  console.log(`  📱 Mobile:  http://${localIP}:${PORT}`);
  console.log('');
  console.log('  📱 Open the Mobile URL on your phone (same WiFi)');
  console.log('  🎤 Say "Lunar" to wake me up!');
  console.log('');
  console.log('  🌙 ═══════════════════════════════════════════');
  console.log('');

  // ─── Auto-start Ollama if not running ────────────────
  function startOllama() {
    return new Promise((resolve) => {
      console.log('  🔄 Ollama not running — starting it automatically...');

      // Common Ollama locations on Windows
      const ollamaPaths = [
        `"${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe" serve`,
        `"${__dirname}\\..\\ollama\\ollama.exe" serve`, // portable folder
        'ollama serve' // system PATH
      ];

      let started = false;
      const tryStart = (i) => {
        if (i >= ollamaPaths.length) {
          console.log('  ❌ Could not auto-start Ollama. Please start it manually: ollama serve');
          return resolve(false);
        }
        const proc = exec(ollamaPaths[i], (err) => {
          if (err && !started) tryStart(i + 1);
        });
        // If it doesn't immediately error, assume it started
        proc.on('spawn', () => {
          started = true;
          console.log('  ✅ Ollama started successfully!');
          resolve(true);
        });
        setTimeout(() => {
          if (!started) tryStart(i + 1);
        }, 1500);
      };

      tryStart(0);
    });
  }

  async function ensureOllama() {
    let status = await ollama.checkHealth();

    // Only try to start local Ollama if we are NOT using a cloud URL
    const isLocal = ollama.baseUrl.includes('localhost') || ollama.baseUrl.includes('127.0.0.1');

    if (!status.ollamaRunning && isLocal) {
      await startOllama();
      // Wait up to 8 seconds for Ollama to be ready
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1000));
        status = await ollama.checkHealth();
        if (status.ollamaRunning) break;
        process.stdout.write(`  ⏳ Waiting for Ollama... (${i + 1}s)\r`);
      }
    }

    if (!status.ollamaRunning) {
      console.log('  ❌ Ollama still not responding. Start it manually: ollama serve');
    } else if (!status.modelAvailable) {
      console.log(`  ⚠️  Model "${ollama.model}" not downloaded yet.`);
      console.log(`  ⚠️  Run: ollama pull ${ollama.model}`);
      console.log(`  📋 Downloaded models: ${status.availableModels.join(', ') || 'none'}`);
    } else {
      console.log(`  ✅ Ollama is running with ${ollama.model}`);
    }
    console.log('');
  }

  ensureOllama();

  // ─── Auto-open browser ───────────────────────────────
  if (config.get('autoOpenBrowser')) {
    const url = `http://localhost:${PORT}`;
    console.log(`  🌐 Auto-opening browser: ${url}`);
    console.log('');
    // Try multiple methods to open browser on Windows/Mac/Linux
    const cmds = [
      `start "" "${url}"`,            // Windows CMD
      `powershell -command Start-Process '${url}'`, // Windows PowerShell
      `xdg-open ${url}`,               // Linux
      `open ${url}`                    // Mac
    ];
    // Try first one that works
    const tryOpen = (i) => {
      if (i >= cmds.length) return;
      exec(cmds[i], (err) => {
        if (err) tryOpen(i + 1);
      });
    };
    setTimeout(() => tryOpen(0), 1000); // 1s delay so server is fully ready
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🌙 Lunar going to sleep... Goodnight! 🌙');
  memory.close();
  process.exit(0);
});
