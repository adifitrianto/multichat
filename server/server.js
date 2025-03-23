const { default: axios } = require('axios');
const { parse } = require('uuid');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7070 });

const clients = {};
const agents = {};
let initAgents = {};
const agentFocusedClient = {};

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    console.log('Received:', parsedMessage);

    switch (parsedMessage.type) {
      case 'CONNECT_CLIENT':
        clients[parsedMessage.clientId] = ws;
        console.log(`Client connected: ${parsedMessage.clientId}`);
        sendMessage(ws, 'Halo', parsedMessage.clientId)
        break;

      case 'INIT_AGENT':
        initAgents = {}
        initAgents[parsedMessage.agentId] = ws;
        console.log(`Agent connected: ${parsedMessage.agentId}`);

        for (const clientId in  clients) {
          console.log(clientId)
          clients[clientId].send(JSON.stringify({
            type: 'SYSTEM_MESSAGE',
            content: 'Agent disconnected'
          }));
        }
        break;

      case 'CONNECT_AGENT':
        agents[parsedMessage.clientId] = ws;

        isFocused = parsedMessage.isFocused ?? false
        if (isFocused) {
          agentFocusedClient[parsedMessage.agentId] = parsedMessage.clientId
        }

        clients[parsedMessage.clientId].send(JSON.stringify({
          type: 'AGENT_ASSIGNED',
          isFocused,
          content: parsedMessage.content
        }));

        console.log(`Agent connected and assigned: ${parsedMessage.clientId}`);
        break;

      case 'CLIENT_TO_BOT':
        const message = parsedMessage.content
        // agents[parsedMessage.agentId] = ws;

        sendMessage(ws, message, parsedMessage.clientId)

        break;

      case 'CLIENT_TO_AGENT':
        if (agents[parsedMessage.clientId]) {
          agents[parsedMessage.clientId].send(JSON.stringify({
            type: 'CLIENT_MESSAGE',
            clientId: parsedMessage.clientId,
            content: parsedMessage.content
          }));
        } else {
          // If agent is not available, notify client
          clients[parsedMessage.clientId].send(JSON.stringify({
            type: 'SYSTEM_MESSAGE',
            content: 'No agent available.'
          }));
        }
        break;

      case 'AGENT_TO_CLIENT':
        if (clients[parsedMessage.clientId]) {
          clients[parsedMessage.clientId].send(JSON.stringify({
            type: 'AGENT_MESSAGE',
            content: parsedMessage.content
          }));
        }
        break;

      case 'REQUEST_AGENT':
        const agent = findAvailableAgent();
        if (agent) {
          agents[parsedMessage.clientId] = agent;

          agent.send(JSON.stringify({
            type: 'CLIENT_REQUEST_AGENT',
            clientId: parsedMessage.clientId
          }));

          clients[parsedMessage.clientId].send(JSON.stringify({
            type: 'AGENT_ASSIGNED'
          }));
        } else {
          const connectedAgent = findConnectedAgent()
          if (connectedAgent) {
            connectedAgent.send(JSON.stringify({
              type: 'CLIENT_REQUEST_AGENT',
              clientId: parsedMessage.clientId
            })); 
          } else {
            clients[parsedMessage.clientId].send(JSON.stringify({
              type: 'SYSTEM_MESSAGE_NO_AGENTS',
              content: 'No agents available at the moment. Please try again later.'
            }));
          }
        }
        break;

      case 'SWITCH_TO_BOT':
        if (agents[parsedMessage.clientId]) {
          // End agent session
          agents[parsedMessage.clientId].send(JSON.stringify({
            type: 'SESSION_ENDED',
            clientId: parsedMessage.clientId
          }));
        }

        // Notify client that it's back to bot mode
        clients[parsedMessage.clientId].send(JSON.stringify({
          type: 'SESSION_ENDED'
        }));
        console.log(`Client ${parsedMessage.clientId} switched back to bot`);
        break;

      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  ws.on('close', () => {
    // Cleanup client and agent connections
    for (const clientId in clients) {
      if (clients[clientId] === ws) {
        delete clients[clientId];
        console.log(`Client ${clientId} disconnected`);
      }
    }

    for (const agentId in agents) {
      if (agents[agentId] === ws) {
        delete agents[agentId];
        console.log(`Agent ${agentId} disconnected`);
      }
    }
  });
});

function findAvailableAgent() {
  // Return the first available agent (if any)
  const agentIds = Object.keys(agents);
  return agentIds.length > 0 ? agents[agentIds[0]] : null;
}

function findConnectedAgent() {
  // Return the first available agent (if any)
  const agentIds = Object.keys(initAgents);
  return agentIds.length > 0 ? initAgents[agentIds[0]] : null;
}

async function sendMessage(ws, message, clientId) {
  if (message) {
    // handleIncomingMessage({ text: message, sender: 'client' });

    try {
      const response = await fetch('http://localhost:5005/webhooks/rest/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          message: message
        })
      });
  
      const data = await response.json();
  
      const result = data[0].text ?? undefined
      if (result) {
        responseFromBot(ws, result, clientId)
      }
    } catch (e) {
      console.error(e)
      ws.send(JSON.stringify({
        type: 'BOT_MESSAGE',
        clientId,
        content: "There was an error processing your request. Please try again later."
      }));
    }

    // data.forEach(msg => handleIncomingMessage({ text: msg.text, sender: 'bot' }));
    // if (!isTalkingToAgent) {
    // } else {
    //   console.log("Agent mode is enabled — no message sent to Rasa");
    // }
    //
    // chatInput.value = '';
  }
}

function responseFromBot(ws, message, clientId) {
  if (message) {
    ws.send(JSON.stringify({
      type: 'BOT_MESSAGE',
      clientId: clientId,
      content: message,
    }));
  }
}

console.log('WebSocket server running on ws://localhost:7070');
