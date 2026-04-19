# 🌙 Lunar AI — Setup Guide

## Prerequisites

### 1. Install Ollama (FREE — runs AI on your laptop)
1. Go to **https://ollama.com/download**
2. Download and install for Windows
3. Open a terminal and run:
```bash
ollama serve
```
4. In another terminal, pull the DeepSeek model:
```bash
ollama pull deepseek-r1:1.5b
```
> **Note:** The `1.5b` model is lightweight (~1GB) and works on most laptops.
> For better quality (needs 8GB+ RAM): `ollama pull deepseek-r1:7b`

### 2. Install Node.js
1. Go to **https://nodejs.org**
2. Download and install the LTS version

## Quick Start

```bash
# Navigate to the project
cd lunar-ai

# Install dependencies
npm install

# Start Lunar
npm start
```

You'll see:
```
  🌙 LUNAR AI — Your Personal AI Assistant
  
  💻 Laptop:  http://localhost:3000
  📱 Mobile:  http://192.168.x.x:3000
  
  📱 Open the Mobile URL on your phone (same WiFi)
  🎤 Say "Lunar" to wake me up!
```

## Connecting from Your Phone

### Same WiFi (Easy)
1. Make sure your phone is on the **same WiFi** as your laptop
2. Open Chrome on your phone
3. Go to `http://YOUR_LAPTOP_IP:3000` (shown in terminal)
4. Tap "Add to Home Screen" to install as an app

### From Anywhere (Internet Access)
Install ngrok for free tunneling:
```bash
# Install ngrok
npm install -g ngrok

# Start tunnel (in separate terminal)
ngrok http 3000
```
This gives you a public URL like `https://abc123.ngrok.io` that works from anywhere!

## Voice Commands

| Say This | Lunar Does This |
|----------|----------------|
| "Lunar" | Wakes up and listens |
| "Stop" | Stops talking |
| "What's the time?" | Tells current time |
| "System info" | Shows your laptop specs |
| "Open Chrome" | Opens browser |
| "Search for cats" | Google search |
| "Remember that my birthday is June 5" | Saves to memory |
| "What did I ask you to remember?" | Recalls saved notes |

## Changing the AI Model

Edit `services/ollama.js` line 6:
```js
const DEFAULT_MODEL = 'deepseek-r1:7b'; // Better quality, needs more RAM
```

Available free models:
- `deepseek-r1:1.5b` — Fast, lightweight (default)
- `deepseek-r1:7b` — Better quality 
- `llama3.2:3b` — Good balance
- `mistral:7b` — Another great option

## Troubleshooting

**"Ollama not running"** → Run `ollama serve` in a terminal

**"Model not found"** → Run `ollama pull deepseek-r1:1.5b`

**Voice not working** → Use Chrome browser (Firefox/Safari have limited speech API)

**Can't connect from phone** → Check Windows Firewall allows port 3000
