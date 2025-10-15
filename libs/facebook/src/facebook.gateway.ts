import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  // Remove namespace to use root namespace
})
export class FacebookGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();
  // Track which page IDs each client is subscribed to
  private clientPageSubscriptions: Map<string, Set<string>> = new Map();

  constructor() {}

  afterInit(server: Server) {
    console.log('Facebook WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
    
    // Store connection
    this.connectedClients.set(client.id, client);
    console.log(`✅ Client ${client.id} connected successfully`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.clientPageSubscriptions.delete(client.id);
    console.log(`👋 Client disconnected: ${client.id}`);
  }

  // Subscribe a client to one or more page IDs (payload: { accessToken?: string, pageIds: string[] })
  @SubscribeMessage('connectPages')
  handleConnectPages(client: Socket, payload: { accessToken?: string; pageIds?: string[] }) {
    const pageIds = Array.isArray(payload?.pageIds) ? payload.pageIds : [];
    const cleaned = pageIds
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p.length > 0);

    // In a future iteration, validate payload.accessToken if needed.

    this.clientPageSubscriptions.set(client.id, new Set(cleaned));
    console.log(`🔗 Client ${client.id} connected pages: [${cleaned.join(', ')}]`);
  }


  // Broadcast a message only to clients subscribed to a specific pageId
  broadcastMessageToPage(pageId: string, data: any) {
    if (!pageId) {
      return;
    }
    let delivered = 0;
    for (const [clientId, socket] of this.connectedClients.entries()) {
      const pages = this.clientPageSubscriptions.get(clientId);
      if (pages && pages.has(pageId)) {
        socket.emit('new_message', data);
        delivered += 1;
      }
    }
    console.log(`📢 Broadcasted page ${pageId} message to ${delivered} subscribed clients`, data);
  }

  // Broadcast a conversation only to clients subscribed to a specific pageId
  broadcastConversationToPage(pageId: string, data: any) {
    if (!pageId) {
      return;
    }
    let delivered = 0;
    for (const [clientId, socket] of this.connectedClients.entries()) {
      const pages = this.clientPageSubscriptions.get(clientId);
      if (pages && pages.has(pageId)) {
        socket.emit('new_conversation', data);
        delivered += 1;
      }
    }
    console.log(`💬 Broadcasted page ${pageId} conversation to ${delivered} subscribed clients`, data);
  }

  // Removed unused helpers and page-specific broadcast
}

