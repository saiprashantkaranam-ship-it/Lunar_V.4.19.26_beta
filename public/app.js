/**
 * 🌙 Lunar AI — Reactive Orb Interface
 * Mood-changing AI orb with voice, Lottie support, emoji reactions
 */

const $ = sel => document.querySelector(sel);
const socket = io();

// ─── State ───────────────────────────────────────────
const state = {
  connected: false,
  listening: false,
  speaking: false,
  currentMood: 'neutral',
  autoVoice: true,
  speechRate: 1.0,
  usingLottie: false
};

// ─── DOM ─────────────────────────────────────────────
const aiOrb = $('#ai-orb');
const lottieOrb = $('#lottie-orb');
const emojiFlash = $('#emoji-flash');
const moodLabel = $('#mood-label');
const transcript = $('#transcript');
const messagesList = $('#messages-list');
const textInput = $('#text-input');
const btnSend = $('#btn-send');
const btnMic = $('#btn-mic');
const statusDot = $('.status-dot');
const statusText = $('#status-text');

// ─── Mood System ─────────────────────────────────────
const MOODS = {
  neutral:  { emoji: '🌙', label: 'Calm & Ready' },
  happy:    { emoji: '😊', label: 'Happy' },
  evil:     { emoji: '😈', label: 'Evil Mode' },
  sad:      { emoji: '😢', label: 'Sad...' },
  excited:  { emoji: '🤩', label: 'Excited!' },
  angry:    { emoji: '😡', label: 'Angry' },
  thinking: { emoji: '🤔', label: 'Thinking...' },
  love:     { emoji: '💜', label: 'Feeling loved' }
};

// Keywords that trigger mood changes
const MOOD_TRIGGERS = {
  evil: ['evil mode', 'dark mode', 'villain mode', 'be evil', 'become evil', 'turn evil'],
  happy: ['good job', 'thank you', 'thanks', 'awesome', 'great', 'well done', 'love you', 'you\'re the best', 'nice', 'perfect'],
  sad: ['stupid', 'useless', 'hate you', 'you suck', 'bad', 'terrible', 'worst', 'shut up', 'go away', 'dumb', 'idiot'],
  angry: ['i\'m angry', 'i\'m mad', 'angry mode', 'rage mode'],
  excited: ['excited', 'amazing', 'incredible', 'wow', 'omg', 'let\'s go'],
  love: ['i love you', 'love mode', 'heart', 'you\'re sweet'],
  neutral: ['normal mode', 'calm down', 'reset', 'be normal', 'default mode']
};

function detectMood(text) {
  const lower = text.toLowerCase();
  for (const [mood, triggers] of Object.entries(MOOD_TRIGGERS)) {
    if (triggers.some(t => lower.includes(t))) return mood;
  }
  return null;
}

function setMood(mood) {
  if (!MOODS[mood] || mood === state.currentMood) return;
  
  const prev = state.currentMood;
  state.currentMood = mood;

  // Update CSS orb
  aiOrb.className = `ai-orb mood-${mood}`;
  if (state.listening) aiOrb.classList.add('listening');
  if (state.speaking) aiOrb.classList.add('speaking');

  // Update Lottie filter color
  if (state.usingLottie) {
    const hueMap = { neutral:260, happy:45, evil:0, sad:210, excited:185, angry:0, thinking:270, love:330 };
    lottieOrb.style.filter = `drop-shadow(0 0 40px var(--mood-glow)) hue-rotate(${(hueMap[mood]||0) - 260}deg)`;
  }

  // Flash emoji reaction
  flashEmoji(MOODS[mood].emoji);

  // Update label
  moodLabel.textContent = MOODS[mood].label;
  moodLabel.style.color = `var(--mood)`;
}

function flashEmoji(emoji) {
  emojiFlash.textContent = emoji;
  emojiFlash.classList.remove('hidden');
  // Force reflow for animation restart
  emojiFlash.style.animation = 'none';
  emojiFlash.offsetHeight;
  emojiFlash.style.animation = '';

  setTimeout(() => emojiFlash.classList.add('hidden'), 2200);
}

// ─── Orb Particles ───────────────────────────────────
function createOrbParticles() {
  const container = $('#orb-particles');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'orb-particle';
    p.style.setProperty('--start', `${i * 30}deg`);
    p.style.setProperty('--radius', `${80 + Math.random() * 30}px`);
    p.style.setProperty('--duration', `${4 + Math.random() * 4}s`);
    p.style.left = '50%';
    p.style.top = '50%';
    container.appendChild(p);
  }
}

// ─── Speech Recognition ──────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let wakeRecognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;
  wakeRecognition.lang = 'en-US';
}

// ─── Speech Synthesis ────────────────────────────────
const synth = window.speechSynthesis;
let selectedVoice = null;

function loadVoices() {
  const voices = synth.getVoices();
  const sel = $('#voice-select');
  if (!sel || !voices.length) return;
  sel.innerHTML = '';
  voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    if (['Zira','Google US','Samantha'].some(p => v.name.includes(p))) {
      opt.selected = true;
      selectedVoice = v;
    }
    sel.appendChild(opt);
  });
  if (!selectedVoice && voices.length) selectedVoice = voices[0];
  sel.onchange = e => { selectedVoice = voices[parseInt(e.target.value)]; };
}
synth.onvoiceschanged = loadVoices;
loadVoices();

function speak(text) {
  if (!state.autoVoice || !synth) return;
  synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  if (selectedVoice) utt.voice = selectedVoice;
  utt.rate = state.speechRate;
  utt.onstart = () => {
    state.speaking = true;
    aiOrb.classList.add('speaking');
    moodLabel.textContent = 'Speaking...';
  };
  utt.onend = () => {
    state.speaking = false;
    aiOrb.classList.remove('speaking');
    moodLabel.textContent = MOODS[state.currentMood].label;
    startWakeWord();
  };
  synth.speak(utt);
}

// ─── Wake Word ───────────────────────────────────────
function startWakeWord() {
  if (!wakeRecognition || state.listening || state.speaking) return;
  try { wakeRecognition.start(); } catch(e) {}
}

function stopWakeWord() {
  try { wakeRecognition.stop(); } catch(e) {}
}

if (wakeRecognition) {
  wakeRecognition.onresult = e => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript.toLowerCase();
      if (t.includes('lunar') || t.includes('luna')) {
        stopWakeWord();
        startListening();
        return;
      }
      if (state.speaking && (t.includes('stop') || t.includes('quiet'))) {
        synth.cancel();
        state.speaking = false;
        aiOrb.classList.remove('speaking');
        moodLabel.textContent = MOODS[state.currentMood].label;
      }
    }
  };
  wakeRecognition.onerror = () => {};
  wakeRecognition.onend = () => {
    if (!state.listening && !state.speaking && state.connected) {
      setTimeout(startWakeWord, 500);
    }
  };
}

// ─── Active Listening ────────────────────────────────
function startListening() {
  if (!recognition) return;
  state.listening = true;
  aiOrb.classList.add('listening');
  btnMic.classList.add('active');
  moodLabel.textContent = '🎤 Listening...';
  transcript.classList.remove('hidden');
  transcript.textContent = '...';
  try { recognition.start(); } catch(e) { recognition.stop(); setTimeout(() => recognition.start(), 100); }
}

function stopListening() {
  state.listening = false;
  aiOrb.classList.remove('listening');
  btnMic.classList.remove('active');
  transcript.classList.add('hidden');
  moodLabel.textContent = MOODS[state.currentMood].label;
  try { recognition.stop(); } catch(e) {}
}

if (recognition) {
  recognition.onresult = e => {
    let final = '', interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    if (interim) transcript.textContent = interim;
    if (final.trim()) {
      stopListening();
      const lower = final.toLowerCase().trim();
      if (['stop','sleep','nevermind','go to sleep'].includes(lower)) {
        startWakeWord();
        return;
      }
      sendMessage(final.trim(), 'voice');
    }
  };
  recognition.onerror = () => { stopListening(); startWakeWord(); };
  recognition.onend = () => { if (state.listening) try { recognition.start(); } catch(e) {} };
}

// ─── Send Message ────────────────────────────────────
function sendMessage(text, source = 'text') {
  if (!text.trim() || !state.connected) return;

  // Check for mood triggers
  const mood = detectMood(text);
  if (mood) setMood(mood);

  addMsg('user', text);
  socket.emit('message', { text, source });
  textInput.value = '';
  textInput.style.height = 'auto';
  btnSend.disabled = true;
}

function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messagesList.appendChild(div);
  // Keep only last 8 messages visible
  while (messagesList.children.length > 8) messagesList.removeChild(messagesList.firstChild);
  const feed = $('#chat-feed');
  feed.scrollTop = feed.scrollHeight;
}

function showThinking() {
  setMood('thinking');
  const div = document.createElement('div');
  div.className = 'msg thinking';
  div.id = 'thinking-msg';
  div.textContent = 'Thinking...';
  messagesList.appendChild(div);
}

function removeThinking() {
  const el = $('#thinking-msg');
  if (el) el.remove();
}

// ─── Socket Events ───────────────────────────────────
socket.on('connected', data => {
  state.connected = true;
  statusDot.classList.add('on');
  statusText.textContent = 'Online';
  startWakeWord();
  loadSystemInfo(); // Get paths on connect
});

socket.on('system_event', data => {
  if (data.type === 'sync') {
    console.log(data.message);
    flashEmoji('🔄');
    moodLabel.textContent = 'Syncing updates...';
    setTimeout(() => moodLabel.textContent = MOODS[state.currentMood].label, 2000);
  }
});

socket.on('disconnect', () => {
  state.connected = false;
  statusDot.classList.remove('on');
  statusText.textContent = 'Offline';
});

socket.on('thinking', () => showThinking());

let streamMsg = null;
socket.on('response_chunk', data => {
  removeThinking();
  if (!streamMsg) { streamMsg = document.createElement('div'); streamMsg.className = 'msg assistant'; messagesList.appendChild(streamMsg); }
  streamMsg.textContent += data.text;
  $('#chat-feed').scrollTop = $('#chat-feed').scrollHeight;
});

socket.on('response', data => {
  removeThinking();
  if (streamMsg) { streamMsg.textContent = data.text; streamMsg = null; }
  else addMsg('assistant', data.text);

  // Detect mood from AI response
  const rMood = detectMood(data.text);
  if (rMood && rMood !== 'thinking') setMood(rMood);
  else if (state.currentMood === 'thinking') setMood('neutral');

  speak(data.text);
});

// ─── UI Events ───────────────────────────────────────
btnSend.onclick = () => sendMessage(textInput.value);
textInput.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(textInput.value); } };
textInput.oninput = () => {
  btnSend.disabled = !textInput.value.trim();
  textInput.style.height = 'auto';
  textInput.style.height = Math.min(textInput.scrollHeight, 80) + 'px';
};

btnMic.onclick = () => {
  if (state.speaking) { synth.cancel(); state.speaking = false; aiOrb.classList.remove('speaking'); }
  else if (state.listening) { stopListening(); startWakeWord(); }
  else { stopWakeWord(); startListening(); }
};

// Tap orb to toggle listening too
aiOrb.onclick = () => btnMic.click();

// Settings
async function loadConfig() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    const toggle = $('#auto-open-browser');
    if (toggle) toggle.checked = cfg.autoOpenBrowser !== false;
  } catch (e) {}
}

$('#btn-settings').onclick = () => {
  $('#settings-panel').classList.toggle('hidden');
  $('#settings-panel').classList.toggle('visible');
  checkOllama();
  loadApiKeys();
  loadConfig();
  loadSystemInfo();
};
$('#close-settings').onclick = () => { $('#settings-panel').classList.add('hidden'); $('#settings-panel').classList.remove('visible'); };

$('#speech-rate').oninput = e => { state.speechRate = parseFloat(e.target.value); $('#speech-rate-val').textContent = state.speechRate.toFixed(1)+'x'; };
$('#auto-voice').onchange = e => { state.autoVoice = e.target.checked; };

$('#auto-open-browser').onchange = async e => {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoOpenBrowser: e.target.checked })
    });
    flashEmoji(e.target.checked ? '🌐' : '🔕');
  } catch (err) { console.error('Failed to save config'); }
};


// ─── Lottie Upload ───────────────────────────────────
$('#lottie-upload').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      lottieOrb.load(data);
      aiOrb.classList.add('hidden');
      lottieOrb.classList.remove('hidden');
      state.usingLottie = true;
      moodLabel.textContent = 'Custom animation loaded!';
      flashEmoji('✨');
    } catch(err) {
      moodLabel.textContent = 'Invalid Lottie file';
      flashEmoji('❌');
    }
  };
  reader.readAsText(file);
};

$('#btn-reset-anim').onclick = () => {
  state.usingLottie = false;
  lottieOrb.classList.add('hidden');
  aiOrb.classList.remove('hidden');
  moodLabel.textContent = MOODS[state.currentMood].label;
  flashEmoji('🌙');
};

// ─── Ollama & Model Management ────────────────────────
async function checkOllama() {
  const el = $('#ollama-status');
  const modelSelect = $('#model-select');
  el.textContent = 'Checking...';
  
  try {
    const r = await (await fetch('/api/models')).json();
    if (r.ollamaRunning) {
      el.innerHTML = `✅ Ollama Online<br>Model: ${r.currentModel}`;
      
      // Update select to match current model
      if (r.currentModel) modelSelect.value = r.currentModel;
      
      // Mark available models in select
      const available = r.availableModels || [];
      Array.from(modelSelect.options).forEach(opt => {
        const isReady = available.some(m => m.includes(opt.value));
        opt.textContent = isReady ? `✅ ${opt.value}` : `⬇️ ${opt.value}`;
      });
    } else {
      el.innerHTML = '❌ Ollama offline<br>Run: ollama serve';
    }
  } catch(e) { el.textContent = '❌ Server connection error'; }
}

$('#btn-pull-model').onclick = async () => {
  const model = $('#model-select').value;
  const progressContainer = $('#download-progress-container');
  const progressBar = $('#download-progress-bar');
  const status = $('#download-status');
  const btn = $('#btn-pull-model');

  btn.disabled = true;
  progressContainer.classList.remove('hidden');
  status.textContent = `Starting ${model}...`;
  progressBar.style.width = '0%';

  try {
    const response = await fetch('/api/models/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.replace('data: ', ''));
        
        if (data.status === 'success') {
          status.textContent = 'Download Complete!';
          progressBar.style.width = '100%';
          setTimeout(() => progressContainer.classList.add('hidden'), 3000);
          checkOllama();
        } else if (data.status === 'error') {
          status.textContent = `Error: ${data.error}`;
        } else if (data.completed && data.total) {
          const percent = Math.round((data.completed / data.total) * 100);
          progressBar.style.width = `${percent}%`;
          status.textContent = `${data.status} ${percent}%`;
        } else {
          status.textContent = data.status || 'Processing...';
        }
      }
    }
  } catch (err) {
    status.textContent = `Failed: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
};

function updateModelInfo() {
  const sel = $('#model-select');
  const opt = sel.options[sel.selectedIndex];
  const model = sel.value;
  $('#cmd-text').textContent = `ollama pull ${model}`;
  $('#model-size').textContent = opt.dataset.size || '?';
  $('#model-ram').textContent = opt.dataset.ram || '?';
}

$('#model-select').onchange = async () => {
  updateModelInfo();
  const model = $('#model-select').value;
  try {
    await fetch('/api/models/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    checkOllama();
    flashEmoji('🧠');
  } catch(e) { console.error('Failed to set model'); }
};

$('#btn-copy-cmd').onclick = () => {
  const cmd = $('#cmd-text').textContent;
  navigator.clipboard.writeText(cmd);
  $('#btn-copy-cmd').textContent = '✅';
  setTimeout(() => $('#btn-copy-cmd').textContent = '📋', 1500);
};


// ─── API Key Management ──────────────────────────────
async function loadApiKeys() {
  const list = $('#api-keys-list');
  list.innerHTML = 'Loading...';
  try {
    const keys = await (await fetch('/api/keys')).json();
    if (!keys.length) {
      list.innerHTML = '<span style="color:rgba(255,255,255,0.3);font-size:0.75rem">No keys yet. Generate one above.</span>';
      return;
    }
    list.innerHTML = '';
    keys.forEach(k => {
      const card = document.createElement('div');
      card.className = 'key-card';
      card.innerHTML = `
        <div class="key-info">
          <div class="key-label">${k.label}</div>
          <div class="key-value">${k.key}</div>
        </div>
        <div class="key-actions">
          <button class="key-btn copy-btn" title="Copy full key">📋</button>
          <button class="key-btn revoke" title="Revoke">✕</button>
        </div>`;
      card.querySelector('.copy-btn').onclick = () => {
        navigator.clipboard.writeText(k.fullKey);
        flashEmoji('📋');
      };
      card.querySelector('.revoke').onclick = async () => {
        await fetch('/api/keys/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: k.fullKey })
        });
        loadApiKeys();
        flashEmoji('🗑️');
      };
      list.appendChild(card);
    });
  } catch (e) { list.innerHTML = 'Error loading keys'; }
}

$('#btn-generate-key').onclick = async () => {
  const label = $('#key-label').value.trim() || 'default';
  try {
    const result = await (await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label })
    })).json();
    
    $('#key-label').value = '';
    loadApiKeys();
    flashEmoji('🔑');
    
    // Also show the full key in chat so user can copy it
    addMsg('assistant', `🔑 New API key generated!\n\nKey: ${result.key}\nLabel: ${result.label}\n\nUse: curl -X POST http://localhost:3000/api/lunar -H "Authorization: Bearer ${result.key}" -H "Content-Type: application/json" -d '{"message": "hello"}'`);
  } catch (e) { console.error('Failed to generate key'); }
};

// ─── System & Paths ──────────────────────────────────
async function loadSystemInfo() {
  try {
    const info = await (await fetch('/api/system/info')).json();
    $('#path-project').textContent = info.projectPath;
    $('#path-start-server').textContent = `cd "${info.projectPath}" && node server.js`;
    $('#path-downloads').textContent = info.downloadsPath;
    $('#sync-toggle').checked = info.isSyncing;
  } catch (e) {}
}

$('#btn-create-shortcut').onclick = async () => {
  const iconPath = $('#icon-path').value.trim();
  try {
    const res = await (await fetch('/api/system/shortcut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iconPath })
    })).json();
    
    if (res.success) flashEmoji('✅');
    else flashEmoji('❌');
    alert(res.message);
  } catch (e) { alert('Failed to create shortcut'); }
};

$('#sync-toggle').onchange = async e => {
  try {
    const res = await (await fetch('/api/system/sync/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: e.target.checked })
    })).json();
    flashEmoji(res.enabled ? '🔄' : '⏹️');
  } catch (e) { console.error('Sync toggle failed'); }
};

$('#btn-sync-now').onclick = async () => {
  const btn = $('#btn-sync-now');
  btn.disabled = true;
  btn.textContent = 'Syncing...';
  try {
    const res = await (await fetch('/api/system/sync/now', { method: 'POST' })).json();
    flashEmoji(res.success ? '✅' : '❌');
    alert(res.message);
  } catch (e) { alert('Sync failed'); }
  btn.disabled = false;
  btn.textContent = 'Manual Sync Now';
};

function copyText(id) {
  const text = $('#' + id).textContent;
  navigator.clipboard.writeText(text);
  flashEmoji('📋');
}

function initParticles() {
  const c = $('#particles-canvas'), ctx = c.getContext('2d');
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const pts = Array.from({length:35}, () => ({
    x:Math.random()*c.width, y:Math.random()*c.height,
    vx:(Math.random()-0.5)*0.25, vy:(Math.random()-0.5)*0.25,
    s:Math.random()*1.5+0.5, o:Math.random()*0.4+0.1
  }));
  (function draw() {
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0;
      if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2);
      ctx.fillStyle=`rgba(124,92,252,${p.o})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
}

// ─── Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  createOrbParticles();
  btnSend.disabled = true;
  if (!SpeechRecognition) moodLabel.textContent = 'Voice requires Chrome';
  loadSystemInfo();
});
