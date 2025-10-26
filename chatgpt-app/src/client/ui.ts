import { Message } from "../messages";

// UI management class
export class UI {
  private messagesContainer: HTMLElement | null = null;
  private statusContainer: HTMLElement | null = null;

  render(): void {
    const app = document.getElementById('app');
    if (!app) {
      console.error('App container not found');
      return;
    }

    app.innerHTML = `
      <div class="chat-container">
        <header class="chat-header">
          <h1>ChatGPT Client Simulator</h1>
          <button id="test-button" class="test-button">Test Connection</button>
        </header>
        
        <div id="status" class="status-container"></div>
        
        <div id="messages" class="messages-container">
          <div class="message assistant">
            <div class="message-content">
              👋 Hello! I'm your ChatGPT assistant. How can I help you today?<br>
                 Just kidding!<br>
                 I can only show you a Todo App if you ask nicely.
                 The only messages I understand are:<br>
                 <ul>
                    <li>show</li>
                    <li>hide</li>
                  </ul> 
                  <br><div class="status-info">If I don't understand what you say, I will just echo it back!</div>
            </div>
            <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        
        <div class="input-container">
          <input 
            type="text" 
            id="message-input" 
            placeholder="Type your message here..." 
            class="message-input"
          />
          <button id="send-button" class="send-button">Send</button>
        </div>
      </div>
    `;

    this.messagesContainer = document.getElementById('messages');
    this.statusContainer = document.getElementById('status');
  }

  addMessage(message: Message): void {
    if (!this.messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}`;
    // No skipping HTML!! The Server is trusted and knows what it's doing.
    messageElement.innerHTML = `
      <div class="message-content">${message.content}</div>
      <div class="message-timestamp">${message.timestamp}</div>
    `;

    this.messagesContainer.appendChild(messageElement);

    if (message.role === 'user' && message.content === 'hide') {
      this.hideTodoApp();
    }

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (!this.statusContainer) return;

    this.statusContainer.innerHTML = `
      <div class="status-message status-${type}">
        ${this.escapeHtml(message)}
      </div>
    `;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (this.statusContainer) {
        this.statusContainer.innerHTML = '';
      }
    }, 5000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private hideTodoApp(): void {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.remove();
    }
  }
}