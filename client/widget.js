(function() {
  const socket = new WebSocket('ws://localhost:7070');
  let clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
  let chatMode = 'bot';

  socket.addEventListener('open', () => {
    console.log('Connected to server');
    socket.send(JSON.stringify({
      type: 'CONNECT_CLIENT',
      clientId
    }));
  });

  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Message from server:', data);

    switch (data.type) {
      case 'BOT_MESSAGE':
        displayMessage(data.content, 'bot');
        break;
      case 'AGENT_MESSAGE':
        displayMessage(data.content, 'agent');
        break;
      case 'SYSTEM_MESSAGE':
        displayMessage(data.content, 'system');
        break;
      case 'SYSTEM_MESSAGE_NO_AGENTS':
        displayMessage(data.content, 'system');
        chatMode = 'agent'
        break;
      case 'AGENT_ASSIGNED':
        chatMode = 'agent';
        const isFocused = data.isFocused ?? false
        if (isFocused) {
          displayMessage('You are now connected to a human agent.', 'system');
        }
        if (data.content) { 
          displayMessage(data.content, 'agent');
        }
        toggleButtons(true); // Show "Switch to Bot" button
        break;
      case 'SESSION_ENDED':
        chatMode = 'bot';
        displayMessage('Session with agent ended. Back to bot.', 'system');
        toggleButtons(false); // Show "Talk to Agent" button
        break;
      default:
        console.log('Unknown message type:', data.type);
        break;
    }
  });

  socket.addEventListener('close', () => {
    console.log('Disconnected from server');
    displayMessage('Connection closed.', 'system');
  });

  function sendMessage(message) {
    console.log(chatMode)
    if (chatMode === 'bot') {
      socket.send(JSON.stringify({
        type: 'CLIENT_TO_BOT',
        clientId,
        content: message
      }));
      displayMessage(message, 'client');
    } else if (chatMode === 'agent') {
      socket.send(JSON.stringify({
        type: 'CLIENT_TO_AGENT',
        clientId,
        content: message
      }));
      displayMessage(message, 'client');
    }
  }

  function requestAgent() {
    chatMode = 'agent';
    socket.send(JSON.stringify({
      type: 'REQUEST_AGENT',
      clientId
    }));
    displayMessage('Requesting to speak with a human agent...', 'system');
  }

  function switchToBot() {
    chatMode = 'bot';
    socket.send(JSON.stringify({
      type: 'SWITCH_TO_BOT',
      clientId
    }));
    displayMessage('Switched back to bot.', 'system');
    toggleButtons(false);
  }

  function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    msg.textContent = message;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function toggleButtons(isAgentMode) {
    document.getElementById('agent-btn').style.display = isAgentMode ? 'none' : 'block';
    document.getElementById('bot-btn').style.display = isAgentMode ? 'block' : 'none';
  }

  // Event Listeners
  document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = '';
    }
  });

  document.getElementById('chat-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const input = document.getElementById('chat-input');
      if (input.value.trim()) {
        sendMessage(input.value.trim());
        input.value = '';
      }
    }
  });

  document.getElementById('agent-btn').addEventListener('click', () => {
    requestAgent();
  });

  document.getElementById('bot-btn').addEventListener('click', () => {
    switchToBot();
  });

  // Initialize buttons
  toggleButtons(false);
})();
