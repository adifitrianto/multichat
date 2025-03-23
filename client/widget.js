// === FLOATING WIDGET TOGGLE ===
const chatbotButton = document.getElementById("chatbot-button");
const chatWidget = document.getElementById("chat-widget");
const closeBtn = document.getElementById("close-btn");

// Show the chat widget on button click
chatbotButton.addEventListener("click", () => {
  chatWidget.style.display = "flex"; // Show
});

// Hide the chat widget on close button click
closeBtn.addEventListener("click", () => {
  chatWidget.style.display = "none"; // Hide
});

// === YOUR CHAT LOGIC (WebSocket) ===
(function () {
  // Adjust to your server URL:
  const socket = new WebSocket("ws://localhost:7070");
  let clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
  let chatMode = "bot";
  let lastClient = null;

  socket.addEventListener("open", () => {
    console.log("Connected to server");
    socket.send(
      JSON.stringify({
        type: "CONNECT_CLIENT",
        time: Math.floor(Date.now() / 1000),
        clientId,
      })
    );
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("Message from server:", data);

    switch (data.type) {
      case "BOT_MESSAGE":
        displayMessage(data, "bot");
        break;
      case "AGENT_MESSAGE":
        displayMessage(data, "agent");
        break;
      case "SYSTEM_MESSAGE":
        displayMessage(data, "system");
        break;
      case "SYSTEM_MESSAGE_NO_AGENTS":
        displayMessage(data, "system");
        chatMode = "agent";
        break;
      case "AGENT_ASSIGNED":
        console.log(data);
        chatMode = "agent";

        let content = data.content;
        if (data.isFocused) {
          content = "You are now connected to a human agent.";
        }

        if (lastClient != data.lastClient && data.content) {
          lastClient = data.lastClient;
          displayMessage(data, "system");
        }

        toggleButtons(true); // Show "Switch to Bot" button
        break;
      case "SESSION_ENDED":
        chatMode = "bot";
        displayMessage(
          {
            content: "Session with agent ended. Back to bot.",
            time: Math.floor(Date.now() / 1000),
          },
          "system"
        );
        toggleButtons(false); // Show "Talk to Agent" button
        break;
      default:
        console.log("Unknown message type:", data.type);
        break;
    }
  });

  socket.addEventListener("close", () => {
    console.log("Disconnected from server");
    displayMessage(
      { content: "Connection closed", time: Math.floor(Date.now() / 1000) },
      "system"
    );
  });

  // Send a message from the client (user)
  function sendMessage(message) {
    console.log("Current chatMode:", chatMode);
    if (chatMode === "bot") {
      socket.send(
        JSON.stringify({
          type: "CLIENT_TO_BOT",
          clientId,
          time: Math.floor(Date.now() / 1000),
          content: message,
        })
      );
    } else if (chatMode === "agent") {
      socket.send(
        JSON.stringify({
          type: "CLIENT_TO_AGENT",
          clientId,
          time: Math.floor(Date.now() / 1000),
          content: message,
        })
      );
    }

    displayMessage(
      { content: message, time: Math.floor(Date.now() / 1000) },
      "client"
    );
  }

  // Request a human agent
  function requestAgent() {
    chatMode = "agent";
    socket.send(
      JSON.stringify({
        type: "REQUEST_AGENT",
        time: Math.floor(Date.now() / 1000),
        clientId,
      })
    );

    displayMessage(
      {
        content: "Requesting to speak with a human agent...",
        time: Math.floor(Date.now() / 1000),
      },
      "system"
    );
  }

  // Switch back to bot
  function switchToBot() {
    chatMode = "bot";
    socket.send(
      JSON.stringify({
        type: "SWITCH_TO_BOT",
        time: Math.floor(Date.now() / 1000),
        clientId,
      })
    );
    displayMessage(
      { content: "Switched back to bot.", time: Math.floor(Date.now() / 1000) },
      "system"
    );
    toggleButtons(false);
  }

  // Display a message in the chat box
  function displayMessage(data, sender) {
    const chatBox = document.getElementById("chat-box");

    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = data.content;

    const date = document.createElement("div");
    date.classList.add("message", "date", sender);

    const unixdate = new Date(data.time * 1000); // Convert seconds to milliseconds
    // const year = unixdate.getFullYear();
    // const month = ("0" + (unixdate.getMonth() + 1)).slice(-2); // Months are zero-indexed, so add 1
    // const day = ("0" + unixdate.getDate()).slice(-2);
    const hour = ("0" + unixdate.getHours()).slice(-2);
    const minute = ("0" + unixdate.getMinutes()).slice(-2);
    // const second = ("0" + date.getSeconds()).slice(-2);

    const formattedDate = `${hour}:${minute}`
    date.textContent = formattedDate;

    chatBox.appendChild(msg);
    chatBox.appendChild(date);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Toggle which buttons are visible
  function toggleButtons(isAgentMode) {
    document.getElementById("agent-btn").style.display = isAgentMode
      ? "none"
      : "block";
    document.getElementById("bot-btn").style.display = isAgentMode
      ? "block"
      : "none";
  }

  // --- EVENT LISTENERS ---
  const sendBtn = document.getElementById("send-btn");
  const chatInput = document.getElementById("chat-input");
  const agentBtn = document.getElementById("agent-btn");
  const botBtn = document.getElementById("bot-btn");

  // Send button
  sendBtn.addEventListener("click", () => {
    if (chatInput.value.trim()) {
      sendMessage(chatInput.value.trim());
      chatInput.value = "";
    }
  });

  // Enter key
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && chatInput.value.trim()) {
      sendMessage(chatInput.value.trim());
      chatInput.value = "";
    }
  });

  // Talk to Agent
  agentBtn.addEventListener("click", () => {
    requestAgent();
  });

  // Talk to Bot
  botBtn.addEventListener("click", () => {
    switchToBot();
  });

  // Initialize button states
  toggleButtons(false);
})();
