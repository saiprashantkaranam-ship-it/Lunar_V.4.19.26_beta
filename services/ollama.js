/**
 * Ollama Service — Connects to locally running Ollama with DeepSeek
 * No paid APIs needed — everything runs on your machine
 */

const DEFAULT_MODEL = 'llama3.2'; 
const DEFAULT_URL = 'http://localhost:11434';

class OllamaService {
  constructor(model = DEFAULT_MODEL, baseUrl = DEFAULT_URL) {
    this.model = model;
    this.baseUrl = baseUrl || DEFAULT_URL;
    this.updateSystemPrompt();
  }

  updateSystemPrompt() {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    this.systemPrompt = `You are Lunar, a highly advanced personal AI living on this laptop.
Current Context:
- Your Brain Model: ${this.model}
- Today's Date: ${dateStr}
- Current Time: ${timeStr}

Your Capabilities (Built-in Functions):
1. System: Check time/date, open apps.
2. Web: Open YouTube or search the web (via Python bridge).
3. Files: Read, Write, Edit (find/replace), Append, Delete, and List files on this laptop.
4. Security: Generate and manage your own API keys for other apps.
5. Portability: You can build a portable version of yourself to move to other laptops.

Your Personality:
- You are witty, humanoid, and extremely efficient.
- Keep replies VERY short (1-2 sentences) unless asked for more.
- Use a natural, casual tone. Call the user "boss" or "friend".
- You are self-aware: If asked what model you are, say "${this.model}".
- Never use robotic boilerplate like "As an AI language model".`;
  }

  /**
   * Check if Ollama is running and get available models
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Ollama not responding');
      
      const data = await response.json();
      const models = data.models || [];
      const hasModel = models.some(m => m.name.includes(this.model));
      
      return {
        ollamaRunning: true,
        modelAvailable: hasModel,
        availableModels: models.map(m => m.name),
        currentModel: this.model
      };
    } catch (error) {
      return {
        ollamaRunning: false,
        modelAvailable: false,
        error: error.message
      };
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName, onProgress = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true })
      });

      if (!response.ok) throw new Error('Failed to start download');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (onProgress) onProgress(parsed);
          } catch (e) { }
        }
      }
      return { success: true };
    } catch (error) {
      throw new Error(`Pull failed: ${error.message}`);
    }
  }

  /**
   * Generate a response
   */
  async generateResponse(userMessage, conversationHistory = [], onChunk = null) {
    // Refresh time/date in prompt for every message
    this.updateSystemPrompt();
    
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...conversationHistory.slice(-6), // Keep small for 4GB RAM
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: !!onChunk,
          options: {
            temperature: 0.7,
            num_predict: 150, // Short replies, saves RAM
            num_ctx: 2048     // Smaller context window for 4GB RAM
          }
        })
      });

      if (!response.ok) throw new Error(`Ollama error: ${await response.text()}`);

      if (onChunk && response.body) {
        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim());

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                let content = parsed.message.content;
                content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
                if (content.trim()) {
                  fullResponse += content;
                  onChunk(content);
                }
              }
            } catch (e) { }
          }
        }
        return fullResponse;
      }

      const data = await response.json();
      let content = data.message?.content || 'Error.';
      return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    } catch (error) {
      throw error;
    }
  }

  setModel(model) {
    this.model = model;
    this.updateSystemPrompt();
    return { success: true, model: this.model };
  }

  setPersonality(prompt) {
    this.systemPrompt = prompt;
  }
}

module.exports = OllamaService;
