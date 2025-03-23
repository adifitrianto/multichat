const socket = new WebSocket('ws://localhost:7070');
const clientList = document.getElementById('client-list');
const chatBox = document.getElementById('chat-box');
const chatHeader = document.getElementById('chat-header');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const agentId = `agent-${Date.now()}`;
let currentClient = null;
let conversations = {}; // Store messages for each client

// Handle WebSocket events
socket.addEventListener('open', () => {
  console.log('Connected to server as agent');
  socket.send(JSON.stringify({
    type: 'INIT_AGENT',
    agentId
  }));
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log(message)

  switch (message.type) {
    case 'CLIENT_REQUEST_AGENT':
      handleNewClient(message.clientId);
      break;
    case 'CLIENT_MESSAGE':
      handleIncomingMessage(message.clientId, message.content);
      break;
  }
});

socket.addEventListener('close', () => {
  console.log('Disconnected from server');
});

// Handle new client connection
function handleNewClient(clientId) {
  if (!conversations[clientId]) {
    conversations[clientId] = [];
    addClientToList(clientId);
  }
}

// Handle incoming message
function handleIncomingMessage(clientId, text) {
  if (!conversations[clientId]) {
    conversations[clientId] = [];
    addClientToList(clientId);
  }

  conversations[clientId].push({ text, clientId });

  if (clientId === currentClient) {
    renderMessages(clientId);
  }
}

// Add client to list
function addClientToList(clientId) {
  if ([...clientList.children].some(item => item.dataset.clientId === clientId)) return;

  const item = document.createElement('div');
  item.classList.add('client-item');
  item.dataset.clientId = clientId;
  item.textContent = `Client ${clientId}`;
  item.addEventListener('click', () => switchToClient(clientId));
  clientList.appendChild(item);
}

// Switch to specific client
function switchToClient(clientId) {
  chatHeader.textContent = `Chat with Client ${clientId}`;

  // Remove active state from all items
  document.querySelectorAll('.client-item').forEach(item => {
    item.classList.remove('active');
  });
  
  currentClient = clientId

  for(children of clientList.children) {
    const childrenClientId = children.getAttribute('data-client-id');
    if (currentClient === childrenClientId) {
      children.classList.add('active');

      const message = "Hello! How can I help you today?"

      conversations[currentClient].push({
        text: message,
        sender: 'agent',
      });

      renderMessages(currentClient);
      chatInput.value = '';

      socket.send(JSON.stringify({
        type: 'CONNECT_AGENT',
        clientId: childrenClientId,
        agentId,
        isFocused: true,
        content: message,
      }));

      continue
    }
    
    children.classList.remove('active');

    socket.send(JSON.stringify({
      type: 'CONNECT_AGENT',
      clientId: childrenClientId,
      agentId,
      isFocused: false,
      content: `Agent is currently chat with other user ${currentClient}`,
    }));       
  }
  // // Add active state to current client
  // const activeItem = [...clientList.children].find(item => item.dataset.clientId === clientId);
  // if (activeItem) {
  //   activeItem.classList.add('active'); 

  //   if (currentClient = clientId) {
      
  //   }
  // }

  currentClient = clientId;

  renderMessages(clientId);
}

// Render messages for selected client
function renderMessages(clientId) {
  chatBox.innerHTML = '';
  conversations[clientId].forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(msg.sender === 'agent' ? 'agent' : 'client');
    messageDiv.textContent = msg.text;
    chatBox.appendChild(messageDiv);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message to client
sendBtn.addEventListener('click', () => {
  sendMessage();
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = chatInput.value.trim();

  if (message && currentClient) {
    socket.send(JSON.stringify({
      type: 'AGENT_TO_CLIENT',
      clientId: currentClient,
      content: message,
    }));

    conversations[currentClient].push({
      text: message,
      sender: 'agent',
    });

    renderMessages(currentClient);
    chatInput.value = '';
  }
}
