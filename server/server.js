const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7070 });

const clients = {};
const agents = {};

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    console.log('Received:', parsedMessage);

    switch (parsedMessage.type) {
      case 'CONNECT_CLIENT':
        clients[parsedMessage.clientId] = ws;
        console.log(`Client connected: ${parsedMessage.clientId}`);
        break;

      case 'CONNECT_AGENT':
        agents[parsedMessage.agentId] = ws;
        console.log(`Agent connected: ${parsedMessage.agentId}`);
        break;

      case 'CLIENT_TO_BOT':
        // console.log(`Message to bot from ${parsedMessage.clientId}: ${parsedMessage.content}`);
        // // Simulate bot response (replace with Rasa integration)
        // setTimeout(() => {
        //   if (clients[parsedMessage.clientId]) {
        //     clients[parsedMessage.clientId].send(JSON.stringify({
        //       type: 'BOT_MESSAGE',
        //       content: `Bot reply: ${parsedMessage.content}`
        //     }));
        //   }
        // }, 500);
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
          clients[parsedMessage.clientId].send(JSON.stringify({
            type: 'SYSTEM_MESSAGE',
            content: 'No agents available at the moment. Please try again later.'
          }));
        }
        break;

      case 'SWITCH_TO_BOT':
        if (agents[parsedMessage.clientId]) {
          // End agent session
          agents[parsedMessage.clientId].send(JSON.stringify({
            type: 'SESSION_ENDED',
            clientId: parsedMessage.clientId
          }));

          delete agents[parsedMessage.clientId];
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

console.log('WebSocket server running on ws://localhost:7070');
