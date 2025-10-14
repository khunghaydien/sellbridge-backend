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
    client.emit('connected', { 
      message: 'Connected successfully',
      clientId: client.id,
      timestamp: Date.now()
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`👋 Client disconnected: ${client.id}`);
  }

  /**
   * Handle ping from client
   */
  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong', { 
      message: 'pong',
      timestamp: Date.now(),
      clientId: client.id
    });
  }

  /**
   * Handle authentication from client (no validation needed)
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, data: any): void {
    console.log(`🔐 Client ${client.id} authenticated:`, data);
    client.emit('auth_success', { 
      message: 'Authentication successful',
      clientId: client.id,
      userData: data
    });
  }

  /**
   * Handle join all pages request
   */
  @SubscribeMessage('joinAllPages')
  handleJoinAllPages(client: Socket): void {
    console.log(`📄 Client ${client.id} joined all pages`);
    client.emit('joined_all_pages', { 
      message: 'Successfully joined all pages',
      clientId: client.id,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast message to ALL connected clients (no authentication required)
   */
  broadcastMessage(data: any) {
    this.server.emit('new_message', data);
    console.log(`📢 Broadcasted message to ${this.connectedClients.size} connected clients`, data);
  }

  /**
   * Send to all users of a specific page
   */
  sendToPageUsers(pageId: string, data: any) {
    this.server.emit(`page_${pageId}_message`, data);
    console.log(`📄 Sent message for page ${pageId} to all clients`, data);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get list of connected client IDs
   */
  getConnectedClientIds(): string[] {
    return Array.from(this.connectedClients.keys());
  }
}

