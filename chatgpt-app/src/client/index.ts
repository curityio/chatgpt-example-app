// Main application entry point
import { Message } from '../messages';
import { ApiClient } from './api';
import { UI } from './ui';

class App {
  private apiClient: ApiClient;
  private ui: UI;

  constructor() {
    this.apiClient = new ApiClient();
    this.ui = new UI();
  }

  async init(): Promise<void> {
    console.log('🚀 ChatGPT App initializing...');
    
    // Initialize UI
    this.ui.render();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Test API connection
    await this.testConnection();
    
    console.log('✅ App initialized successfully');
  }

  private setupEventListeners(): void {
    // Send message button
    const sendButton = document.getElementById('send-button') as HTMLButtonElement;
    const messageInput = document.getElementById('message-input') as HTMLInputElement;
    
    if (sendButton && messageInput) {
      sendButton.addEventListener('click', () => this.sendMessage());
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }

    // Test connection button
    const testButton = document.getElementById('test-button') as HTMLButtonElement;
    if (testButton) {
      testButton.addEventListener('click', () => this.testConnection());
    }
  }

  private async sendMessage(): Promise<void> {
    const messageInput = document.getElementById('message-input') as HTMLInputElement;
    const messageContent = messageInput.value.trim();
    
    if (!messageContent) return;

    const message: Message= {role: 'user', content: messageContent, timestamp: new Date().toLocaleTimeString()};
    
    // Add message to UI
    this.ui.addMessage(message);
    messageInput.value = '';
    
    try {
      const response: Message = await this.apiClient.sendMessage(message);
      this.ui.addMessage(response);
    } catch (error) {
      this.ui.showStatus(`❌ Error: ${error}`, 'error');
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.apiClient.testConnection();
      this.ui.showStatus(`✅ Connection OK: ${response.message}`, 'success');
    } catch (error) {
      this.ui.showStatus(`❌ Connection failed: ${error}`, 'error');
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(console.error);
});

// Hot reload support in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔥 Hot reload enabled');
}