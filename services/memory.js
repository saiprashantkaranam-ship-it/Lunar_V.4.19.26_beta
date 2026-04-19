/**
 * Memory Service — JSON-file-based conversation memory
 * No native dependencies needed — pure Node.js
 * Your laptop IS the database — everything stored locally
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MemoryService {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'lunar_memory.json');
    this.data = this._load();
  }

  /**
   * Load database from disk
   */
  _load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.log('Creating fresh memory database...');
    }
    return { conversations: [], messages: [], notes: [] };
  }

  /**
   * Save database to disk
   */
  _save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save memory:', e.message);
    }
  }

  /**
   * Create a new conversation
   */
  createConversation(title = 'New Chat') {
    const id = uuidv4();
    this.data.conversations.push({
      id,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    this._save();
    return id;
  }

  /**
   * Save a message to a conversation
   */
  saveMessage(conversationId, role, content, source = 'text') {
    const id = uuidv4();
    this.data.messages.push({
      id,
      conversation_id: conversationId,
      role,
      content,
      source,
      created_at: new Date().toISOString()
    });

    // Update conversation timestamp
    const conv = this.data.conversations.find(c => c.id === conversationId);
    if (conv) conv.updated_at = new Date().toISOString();

    this._save();
    return id;
  }

  /**
   * Get conversation history for context
   */
  getConversationHistory(conversationId, limit = 20) {
    return this.data.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-limit)
      .map(m => ({ role: m.role, content: m.content }));
  }

  /**
   * Get all conversations
   */
  getConversations(limit = 50) {
    return this.data.conversations
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit);
  }

  /**
   * Search through all messages
   */
  searchMemory(query) {
    const q = query.toLowerCase();
    return this.data.messages
      .filter(m => m.content.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map(m => {
        const conv = this.data.conversations.find(c => c.id === m.conversation_id);
        return { ...m, conversation_title: conv ? conv.title : 'Unknown' };
      });
  }

  /**
   * Save a note / key-value pair (for remembering things)
   */
  saveNote(key, value) {
    const existing = this.data.notes.findIndex(n => n.key === key);
    const note = {
      id: uuidv4(),
      key,
      value,
      updated_at: new Date().toISOString()
    };
    if (existing >= 0) {
      this.data.notes[existing] = note;
    } else {
      this.data.notes.push(note);
    }
    this._save();
  }

  /**
   * Retrieve a note
   */
  getNote(key) {
    const note = this.data.notes.find(n => n.key === key);
    return note ? note.value : null;
  }

  /**
   * Get all notes
   */
  getAllNotes() {
    return this.data.notes
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  /**
   * Get message count stats
   */
  getStats() {
    return {
      totalConversations: this.data.conversations.length,
      totalMessages: this.data.messages.length,
      totalNotes: this.data.notes.length
    };
  }

  /**
   * Close (no-op for JSON, but keeps interface consistent)
   */
  close() {
    this._save();
  }
}

module.exports = MemoryService;
