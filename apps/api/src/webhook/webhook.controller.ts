import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FacebookGateway } from '@app/facebook/facebook.gateway';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly facebookGateway: FacebookGateway,
  ) {}

  /**
   * Facebook Webhook Verification
   * GET /webhook/facebook
   */
  @Get('facebook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_TOKEN || 'FACEBOOK_WEBHOOK_TOKEN_123';

    console.log('🔍 WEBHOOK VERIFICATION REQUEST:');
    console.log('  - Mode:', mode);
    console.log('  - Token:', token);
    console.log('  - Challenge:', challenge);
    console.log('  - Expected Token:', VERIFY_TOKEN);
    console.log('  - Timestamp:', new Date().toISOString());

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WEBHOOK VERIFIED SUCCESSFULLY');
      console.log('  - Returning challenge:', challenge);
      return res.status(200).send(challenge);
    }

    console.log('❌ WEBHOOK VERIFICATION FAILED');
    console.log('  - Reason: Token mismatch or invalid mode');
    return res.status(403).send('Verification failed');
  }

  /**
   * Facebook Webhook Handler
   * POST /webhook/facebook
   */
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    console.log('📨 FACEBOOK WEBHOOK POST REQUEST RECEIVED:');
    console.log('  - Timestamp:', new Date().toISOString());
    console.log('  - Body type:', typeof body);
    console.log('  - Body keys:', Object.keys(body || {}));
    console.log('  - Full body:', JSON.stringify(body, null, 2));

    // Removed dev-only test emission

    // Facebook sends 'page' events
    if (body.object === 'page') {
      console.log('📄 PROCESSING PAGE EVENT:');
      console.log('  - Page object detected');
      console.log('  - Number of entries:', body.entry?.length || 0);

      // Loop through entries (can have multiple)
      for (const entry of body.entry) {
        const pageId = entry.id;
        const time = entry.time;

        console.log('📋 PROCESSING ENTRY:');
        console.log('  - Page ID:', pageId);
        console.log('  - Time:', time);
        console.log('  - Has messaging:', !!entry.messaging);
        console.log('  - Has changes:', !!entry.changes);
        console.log('  - Messaging events count:', entry.messaging?.length || 0);
        console.log('  - Changes count:', entry.changes?.length || 0);

        // Check for messaging events
        if (entry.messaging) {
          console.log('💬 PROCESSING MESSAGING EVENTS:');
          for (const event of entry.messaging) {
            console.log('  - Event type:', event.message ? 'message' : event.postback ? 'postback' : 'other');
            await this.handleMessagingEvent(pageId, event);
          }
        }

        // Ignore entry.changes for now since frontend doesn't consume them
      }

      console.log('✅ PAGE EVENT PROCESSED SUCCESSFULLY');
      return res.status(200).send('EVENT_RECEIVED');
    }

    console.log('⚠️ UNKNOWN EVENT TYPE - NOT A PAGE EVENT');
    console.log('  - Object type:', body.object);
    return res.status(200).send('UNKNOWN_EVENT');
  }

  /**
   * Handle messaging events (messages, postbacks, etc)
   */
  private async handleMessagingEvent(pageId: string, event: any) {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const timestamp = event.timestamp;

    console.log('💬 PROCESSING MESSAGING EVENT:');
    console.log('  - Sender ID:', senderId);
    console.log('  - Recipient ID:', recipientId);
    console.log('  - Page ID:', pageId);
    console.log('  - Timestamp:', timestamp);
    console.log('  - Event keys:', Object.keys(event));

      // Handle message
    if (event.message) {
      const messageData = {
        type: 'message',
        pageId,
        senderId,
        recipientId,
        timestamp,
        messageId: event.message.mid,
        text: event.message.text,
        attachments: event.message.attachments,
        quickReply: event.message.quick_reply,
        isEcho: event.message.is_echo, // Message sent by page
      };

      console.log('📝 NEW MESSAGE DETECTED:');
      console.log('  - Message ID:', messageData.messageId);
      console.log('  - Text:', messageData.text);
      console.log('  - Is Echo:', messageData.isEcho);
      console.log('  - Has Attachments:', !!messageData.attachments);
      console.log('  - Full message data:', JSON.stringify(messageData, null, 2));

      // Send message data to clients subscribed to this page
      this.facebookGateway.broadcastMessageToPage(pageId, messageData);

      // Also create and send conversation format for inbox list
      if (messageData.text && !messageData.isEcho) {
        const conversationData = this.createConversationFromMessage(messageData);
        if (conversationData) {
          console.log('💬 CREATED CONVERSATION DATA:');
          console.log('  - Conversation ID:', conversationData.id);
          console.log('  - Snippet:', conversationData.snippet);
          console.log('  - Participant:', conversationData.participants.data[0]?.name);
          
          // Send conversation data to clients subscribed to this page
          this.facebookGateway.broadcastConversationToPage(pageId, conversationData);
        }
      }
    }

    // Handle postback (button clicks)
    if (event.postback) {
      const postbackData = {
        type: 'postback',
        pageId,
        senderId,
        recipientId,
        timestamp,
        payload: event.postback.payload,
        title: event.postback.title,
      };

      console.log('🔘 POSTBACK DETECTED:');
      console.log('  - Payload:', postbackData.payload);
      console.log('  - Title:', postbackData.title);
      console.log('  - Full postback data:', JSON.stringify(postbackData, null, 2));
      
      this.facebookGateway.broadcastMessageToPage(pageId, postbackData);
    }

    // Handle message delivery
    if (event.delivery) {
      const deliveryData = {
        type: 'delivery',
        pageId,
        senderId,
        timestamp,
        mids: event.delivery.mids,
        watermark: event.delivery.watermark,
      };

      console.log('📬 DELIVERY CONFIRMATION:');
      console.log('  - Message IDs:', deliveryData.mids);
      console.log('  - Watermark:', deliveryData.watermark);
      console.log('  - Full delivery data:', JSON.stringify(deliveryData, null, 2));
      
      this.facebookGateway.broadcastMessageToPage(pageId, deliveryData);
    }

    // Handle message read
    if (event.read) {
      const readData = {
        type: 'read',
        pageId,
        senderId,
        timestamp,
        watermark: event.read.watermark,
      };

      console.log('👁️ MESSAGE READ:');
      console.log('  - Watermark:', readData.watermark);
      console.log('  - Full read data:', JSON.stringify(readData, null, 2));
      
      this.facebookGateway.broadcastMessageToPage(pageId, readData);
    }
  }

  /**
   * Create conversation format from message data
   */
  private createConversationFromMessage(messageData: any) {
    if (!messageData.text || messageData.isEcho) {
      return null;
    }

    // Create conversation ID based on sender and page
    const conversationId = `${messageData.pageId}_${messageData.senderId}`;
    
    // Create participant data
    const participant = {
      name: `User ${messageData.senderId.slice(-4)}`, // Use last 4 digits as name
      email: `${messageData.senderId}@facebook.com`, // Generate email format
      id: messageData.senderId,
    };

    return {
      id: conversationId,
      link: `https://facebook.com/messages/t/${conversationId}`,
      message_count: 1, // New message
      participants: {
        data: [participant],
      },
      senders: {
        data: [participant],
      },
      snippet: messageData.text, // Use text as snippet
      unread_count: 1, // New message = unread
      updated_time: new Date(messageData.timestamp).toISOString(),
      pageId: messageData.pageId,
    };
  }

  // Removed broadcast-to-all helper in favor of page-scoped broadcasting
}



