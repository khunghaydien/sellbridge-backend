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
    console.log(`👋 Client disconnected: ${client.id}`);
  }

  // Removed unused 'ping', 'authenticate', and 'joinAllPages' handlers

  /**
   * Broadcast message to ALL connected clients (no authentication required)
   */
  broadcastMessage(data: any) {
    this.server.emit('new_message', data);
    console.log(`📢 Broadcasted message to ${this.connectedClients.size} connected clients`, data);
  }

  // Removed unused helpers and page-specific broadcast
}

