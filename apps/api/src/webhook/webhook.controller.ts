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
    console.log('🔍 WEBHOOK RECEIVED:', JSON.stringify(body, null, 2));
    
    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id;
        console.log('📄 PROCESSING PAGE ENTRY:', {
          pageId,
          time: entry.time,
          hasMessaging: !!entry.messaging,
          messagingCount: entry.messaging?.length || 0
        });

        if (entry.messaging) {
          for (const event of entry.messaging) {
            console.log('💬 PROCESSING MESSAGING EVENT:', {
              sender: event.sender,
              recipient: event.recipient,
              timestamp: event.timestamp,
              hasMessage: !!event.message,
              messageType: event.message?.text ? 'text' : event.message?.attachments ? 'attachment' : 'other'
            });
            await this.handleMessagingEvent(pageId, event);
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }

    console.log('❌ UNKNOWN WEBHOOK OBJECT:', body.object);
    return res.status(200).send('UNKNOWN_EVENT');
  }

  /**
   * Handle messaging events (messages, postbacks, etc)
   */
  private async handleMessagingEvent(pageId: string, event: any) {
    console.log('🔍 HANDLING MESSAGING EVENT:', {
      pageId,
      senderId: event.sender?.id,
      recipientId: event.recipient?.id,
      hasMessage: !!event.message,
      isEcho: event.message?.is_echo,
      messageText: event.message?.text,
      messageId: event.message?.mid
    });

    if (event.message && !event.message.is_echo) {
      console.log('✅ PROCESSING VALID MESSAGE:', {
        senderId: event.sender.id,
        recipientId: event.recipient.id,
        text: event.message.text,
        messageId: event.message.mid
      });

      const messageData = {
        type: 'message',
        pageId,
        senderId: event.sender.id,
        recipientId: event.recipient.id,
        timestamp: event.timestamp,
        messageId: event.message.mid,
        text: event.message.text,
        attachments: event.message.attachments,
        quickReply: event.message.quick_reply,
        isEcho: event.message.is_echo,
        created_time: new Date(event.timestamp).toISOString(),
      };

      console.log('📤 BROADCASTING MESSAGE TO PAGE:', {
        pageId,
        messageData
      });

      this.facebookGateway.broadcastMessageToPage(pageId, messageData);
    } else {
      console.log('❌ SKIPPING MESSAGE:', {
        reason: !event.message ? 'no_message' : 'is_echo',
        isEcho: event.message?.is_echo
      });
    }
  }
}

