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
  ) { }

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

        // Check for conversation changes (Facebook sends conversation updates)
        if (entry.changes) {
          console.log('📋 PROCESSING CONVERSATION CHANGES:');
          for (const change of entry.changes) {
            console.log('  - Change field:', change.field);
            console.log('  - Change value:', JSON.stringify(change.value, null, 2));

            if (change.field === 'conversations') {
              // Broadcast raw conversation data to frontend
              const conversationData = {
                ...change.value,
                pageId: pageId,
              };

              this.facebookGateway.broadcastConversationToPage(pageId, conversationData);
            }
          }
        }

        // Processed both messaging events and conversation changes
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
        isEcho: event.message.is_echo,
        conversationId: `${pageId}_${senderId}`,
        created_time: new Date(timestamp).toISOString(),
      };

      console.log('📝 NEW MESSAGE DETECTED:');
      console.log('  - Message ID:', messageData.messageId);
      console.log('  - Text:', messageData.text);
      console.log('  - Is Echo:', messageData.isEcho);
      console.log('  - Has Attachments:', !!messageData.attachments);

      // Send raw message data to frontend
      this.facebookGateway.broadcastMessageToPage(pageId, messageData);
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

      this.facebookGateway.broadcastMessageToPage(pageId, readData);
    }
  }

}



