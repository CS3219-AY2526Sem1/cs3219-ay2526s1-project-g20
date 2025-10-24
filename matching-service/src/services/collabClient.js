export async function createSession({ participants }) {
    // For demo: pretend we publish a sessionId for collaboration service
    return {
      sessionId: `S_${Date.now()}`,
      wsUrl: 'wss://collab.example/room',
      wsAuthToken: 'demo-token'
    };
  }
  