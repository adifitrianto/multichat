const socket = new WebSocket("ws://localhost:7070");
const clientList = document.getElementById("client-list");
const chatBox = document.getElementById("chat-box");
const chatHeader = document.getElementById("chat-header");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

const agentId = `agent-${Date.now()}`;
let currentClient = null;
let lastClient = null;
let conversations = {}; // Store messages for each client

// Handle WebSocket events
socket.addEventListener("open", () => {
  console.log("Connected to server as agent");
  socket.send(
    JSON.stringify({
      type: "INIT_AGENT",
      agentId,
      time: Math.floor(Date.now() / 1000),
    })
  );
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  console.log(message);

  switch (message.type) {
    case "CLIENT_REQUEST_AGENT":
      handleNewClient(message.clientId);
      break;
    case "CLIENT_MESSAGE":
      // Pass the time received from the server along with the message
      handleIncomingMessage(message.clientId, message.content, message.time);
      break;
  }
});

socket.addEventListener("close", () => {
  console.log("Disconnected from server");
});

// Handle new client connection
function handleNewClient(clientId) {
  if (!conversations[clientId]) {
    conversations[clientId] = [];
    addClientToList(clientId);
  }
}

// Handle incoming message and add a timestamp
function handleIncomingMessage(clientId, text, timestamp) {
  console.log(clientId, text);
  if (!conversations[clientId]) {
    conversations[clientId] = [];
    addClientToList(clientId);
  }
  // Store sender as 'client' along with the timestamp
  conversations[clientId].push({ text, sender: "client", timestamp });

  if (clientId === currentClient) {
    renderMessages(clientId);
  }
}

// Add client to list
function addClientToList(clientId) {
  if (
    [...clientList.children].some((item) => item.dataset.clientId === clientId)
  )
    return;

  const item = document.createElement("div");
  item.classList.add("client-item");
  item.dataset.clientId = clientId;
  item.textContent = `Client ${clientId}`;
  item.addEventListener("click", () => switchToClient(clientId));
  clientList.appendChild(item);

  console.log(item);
}

// Switch to specific client
function switchToClient(clientId) {
  chatHeader.textContent = `Chat with Client ${clientId}`;

  currentClient = clientId;

  for (let child of clientList.children) {
    const childrenClientId = child.getAttribute("data-client-id");
    let isFocused = false;
    let content = `Agent is currently chatting with another user ${currentClient}`;

    if (currentClient === childrenClientId) {
      isFocused = true;
      content = "You are now connected to a human agent.";
      child.classList.add("active");
    }

    if (lastClient != currentClient) {
      lastClient = currentClient;
    }

    socket.send(
      JSON.stringify({
        type: "CONNECT_AGENT",
        clientId: childrenClientId,
        agentId,
        isFocused,
        lastClient,
        role: "system",
        time: Math.floor(Date.now() / 1000),
        content,
      })
    );

    child.classList.remove("active");
  }

  currentClient = clientId;
  renderMessages(clientId);
}

// Render messages for selected client with the time displayed below each message
function renderMessages(clientId) {
  chatBox.innerHTML = "";
  conversations[clientId].forEach((msg) => {
    const messageDiv = document.createElement("div");
    const messageTime = document.createElement("div");
    
    // Apply classes for the bubble
    messageDiv.classList.add("message");
    messageDiv.classList.add(
      msg.sender === "agent" ? "message-agent" : "message-client"
    );

    // Apply classes for the time
    messageTime.classList.add("message-time");
    messageTime.classList.add(
      msg.sender === "agent" ? "time-agent" : "time-client"
    );

    // Convert the Unix timestamp to a readable time format
    const timeStr = new Date(msg.timestamp * 1000).toLocaleTimeString();

    // Set the bubble text
    messageDiv.innerHTML = `<div class="message-text">${msg.text}</div>`;
    // Set the time text
    messageTime.innerHTML = `<div class="time-text">${timeStr}</div>`;

    // Append both elements
    chatBox.appendChild(messageDiv);
    chatBox.appendChild(messageTime);
  });

  // Always scroll to the bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message to client with a timestamp
sendBtn.addEventListener("click", () => {
  sendMessage();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

function sendMessage() {
  const message = chatInput.value.trim();

  if (message && currentClient) {
    // Create a Unix timestamp for the current message
    const timestamp = Math.floor(Date.now() / 1000);

    socket.send(
      JSON.stringify({
        type: "AGENT_TO_CLIENT",
        clientId: currentClient,
        content: message,
        time: timestamp,
      })
    );

    conversations[currentClient].push({
      text: message,
      sender: "agent",
      timestamp,
    });

    renderMessages(currentClient);
    chatInput.value = "";
  }
}
