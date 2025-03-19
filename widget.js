class ChatWidget {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.initUI();
    this.setupSocketEvents();
  }

  initUI() {
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'chat-widget-container';
    widgetContainer.innerHTML = `
            <div id="chat-header">Chat</div>
            <div id="chat-messages"></div>
            <div id="chat-input-container">
                <input type="text" id="chat-input" placeholder="Type a message..." />
                <button id="chat-send">Send</button>
            </div>
        `;
    document.body.appendChild(widgetContainer);

    // Get references to UI elements
    this.input = document.getElementById('chat-input');
    this.sendButton = document.getElementById('chat-send');
    this.messagesContainer = document.getElementById('chat-messages');

    // Send message on button click
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  setupSocketEvents() {
    this.socket.addEventListener('open', () => {
      console.log('Connected to WebSocket');
      this.addMessage('Connected to chat');
    });

    this.socket.addEventListener('message', (event) => {
      this.addMessage(event.data);
    });

    this.socket.addEventListener('close', () => {
      this.addMessage('Disconnected from chat');
    });
  }

  sendMessage() {
    const message = this.input.value.trim();
    if (message && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      this.addMessage(`You: ${message}`);
      this.input.value = '';
    }
  }

  addMessage(message) {
    const msgElement = document.createElement('div');
    msgElement.textContent = message;
    this.messagesContainer.appendChild(msgElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

// Expose globally for embedding
window.ChatWidget = ChatWidget;

