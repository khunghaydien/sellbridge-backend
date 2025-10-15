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
              // Process conversation data from Facebook
              const conversationData = this.processFacebookConversationData({
                ...change.value,
                pageId: pageId,
              });

              // Broadcast conversation update to clients
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
        isEcho: event.message.is_echo, // Message sent by page
      };

      console.log('📝 NEW MESSAGE DETECTED:');
      console.log('  - Message ID:', messageData.messageId);
      console.log('  - Text:', messageData.text);
      console.log('  - Is Echo:', messageData.isEcho);
      console.log('  - Has Attachments:', !!messageData.attachments);

      // Get sender information from Facebook
      const senderInfo = await this.getSenderInfo(senderId, pageId);

      // Create enhanced message data with sender info
      const enhancedMessageData = {
        ...messageData,
        sender: {
          id: senderId,
          name: senderInfo.name || `Người dùng facebook`,
          picture: senderInfo.picture || null,
        },
        created_time: new Date(timestamp).toISOString(),
      };

      console.log('📤 ENHANCED MESSAGE DATA:');
      console.log('  - Sender Name:', enhancedMessageData.sender.name);
      console.log('  - Sender Picture:', enhancedMessageData.sender.picture ? 'Present' : 'None');

      // Send enhanced message data to clients subscribed to this page
      this.facebookGateway.broadcastMessageToPage(pageId, enhancedMessageData);

      // Update conversation for inbox list
      if (messageData.text && !messageData.isEcho) {
        const conversationData = await this.updateConversationFromMessage(messageData, senderInfo);
        if (conversationData) {
          console.log('💬 UPDATED CONVERSATION DATA:');
          console.log('  - Conversation ID:', conversationData.id);
          console.log('  - Snippet:', conversationData.snippet);
          console.log('  - Participant:', conversationData.participants.data[0]?.name);
          console.log('  - Message Count:', conversationData.message_count);
          console.log('  - Unread Count:', conversationData.unread_count);

          // Send conversation data to clients subscribed to this page
          this.facebookGateway.broadcastConversationToPage(pageId, conversationData);
        }
      }
    }

    // Handle postback (button clicks) - REMOVED as requested
    // Postback events are not needed for conversation updates

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

  // In-memory storage for conversations (in production, use Redis or database)
  private conversations = new Map<string, any>();

  // Cache for sender information to avoid repeated API calls
  private senderInfoCache = new Map<string, any>();

  /**
   * Get sender information from Facebook API
   */
  private async getSenderInfo(senderId: string, pageId: string): Promise<{ name: string; picture: string | null }> {
    const cacheKey = `${pageId}_${senderId}`;

    // Check cache first
    if (this.senderInfoCache.has(cacheKey)) {
      return this.senderInfoCache.get(cacheKey);
    }

    try {
      // Get page access token from environment or database
      // For now, we'll use a placeholder - in production, get from database
      const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

      if (!pageAccessToken) {
        console.log('⚠️ No page access token available for sender info');
        return { name: `Người dùng facebook`, picture: null };
      }

      // Call Facebook Graph API to get user info
      const response = await fetch(`https://graph.facebook.com/v23.0/${senderId}?fields=name,picture&access_token=${pageAccessToken}`);

      if (response.ok) {
        const userData = await response.json();
        const senderInfo = {
          name: userData.name || `Người dùng facebook`,
          picture: userData.picture?.data?.url || null,
        };

        // Cache the result
        this.senderInfoCache.set(cacheKey, senderInfo);

        console.log('👤 SENDER INFO RETRIEVED:');
        console.log('  - Name:', senderInfo.name);
        console.log('  - Picture:', senderInfo.picture ? 'Present' : 'None');

        return senderInfo;
      } else {
        console.log('⚠️ Failed to fetch sender info from Facebook API');
        return { name: `Người dùng facebook`, picture: null };
      }
    } catch (error) {
      console.log('⚠️ Error fetching sender info:', error);
      return { name: `Người dùng facebook`, picture: null };
    }
  }

  /**
   * Get conversation by ID from Facebook API or local storage
   */
  private async getConversationFromFacebook(pageId: string, conversationId: string, pageAccessToken?: string) {
    // If we have access token, try to get from Facebook API
    if (pageAccessToken) {
      try {
        // This would require implementing a method to get specific conversation
        // For now, we'll use local storage
        console.log('📡 Would fetch conversation from Facebook API:', conversationId);
      } catch (error) {
        console.log('⚠️ Failed to fetch from Facebook API, using local data');
      }
    }

    // Fallback to local storage
    return this.conversations.get(conversationId);
  }

  /**
   * Process conversation data from Facebook API
   * This method handles the conversation data structure you provided
   */
  private processFacebookConversationData(conversationData: any) {
    console.log('📨 PROCESSING FACEBOOK CONVERSATION DATA:');
    console.log('  - ID:', conversationData.id);
    console.log('  - Link:', conversationData.link);
    console.log('  - Message Count:', conversationData.message_count);
    console.log('  - Unread Count:', conversationData.unread_count);
    console.log('  - Snippet:', conversationData.snippet);
    console.log('  - Updated Time:', conversationData.updated_time);
    console.log('  - Page ID:', conversationData.pageId);

    // Check if conversation already exists
    const existingConversation = this.conversations.get(conversationData.id);

    if (existingConversation) {
      // Update existing conversation with new data from Facebook
      console.log('🔄 UPDATING EXISTING CONVERSATION WITH FACEBOOK DATA');
      console.log('  - Previous snippet:', existingConversation.snippet);
      console.log('  - New snippet:', conversationData.snippet);

      // Merge Facebook data with existing conversation
      const updatedConversation = {
        ...existingConversation,
        ...conversationData,
        // Keep local message count if it's higher (in case of missed updates)
        message_count: Math.max(existingConversation.message_count || 0, conversationData.message_count || 0),
        // Keep local unread count if it's higher
        unread_count: Math.max(existingConversation.unread_count || 0, conversationData.unread_count || 0),
      };

      this.conversations.set(conversationData.id, updatedConversation);
      return updatedConversation;
    } else {
      // Store new conversation data
      console.log('🆕 STORING NEW CONVERSATION FROM FACEBOOK');
      this.conversations.set(conversationData.id, conversationData);
      return conversationData;
    }
  }

  /**
   * Update conversation from message data
   * This method handles both creating new conversations and updating existing ones
   */
  private async updateConversationFromMessage(messageData: any, senderInfo?: { name: string; picture: string | null }) {
    if (!messageData.text || messageData.isEcho) {
      return null;
    }

    // Create conversation ID based on sender and page (Facebook format)
    const conversationId = `${messageData.pageId}_${messageData.senderId}`;

    // Try to get existing conversation from Facebook API or local storage
    let conversation = await this.getConversationFromFacebook(messageData.pageId, conversationId);

    if (!conversation) {
      // Create new conversation using Facebook data structure
      console.log('🆕 CREATING NEW CONVERSATION:', conversationId);

      conversation = {
        id: conversationId,
        link: `https://facebook.com/messages/t/${conversationId}`,
        message_count: 1,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        snippet: messageData.text,
        unread_count: 1,
        updated_time: new Date(messageData.timestamp).toISOString(),
        pageId: messageData.pageId,
        participants: {
          data: [{
            name: senderInfo?.name || `Người dùng facebook`,
            id: messageData.senderId,
            picture: senderInfo?.picture || null,
          }]
        },
        senders: {
          data: [{
            name: senderInfo?.name || `Người dùng facebook`,
            id: messageData.senderId,
            picture: senderInfo?.picture || null,
          }]
        },
      };
    } else {
      // Update existing conversation
      console.log('🔄 UPDATING EXISTING CONVERSATION:', conversationId);
      console.log('  - Previous message count:', conversation.message_count);
      console.log('  - Previous snippet:', conversation.snippet);

      conversation.message_count += 1;
      conversation.snippet = messageData.text; // Update snippet with latest message
      conversation.unread_count += 1; // Increment unread count
      conversation.updated_time = new Date(messageData.timestamp).toISOString();

      // Update sender info if available
      if (senderInfo && conversation.participants?.data?.[0]) {
        conversation.participants.data[0].name = senderInfo.name;
        conversation.participants.data[0].picture = senderInfo.picture;
      }
      if (senderInfo && conversation.senders?.data?.[0]) {
        conversation.senders.data[0].name = senderInfo.name;
        conversation.senders.data[0].picture = senderInfo.picture;
      }

      console.log('  - New message count:', conversation.message_count);
      console.log('  - New snippet:', conversation.snippet);
    }

    // Store/update conversation in memory
    this.conversations.set(conversationId, conversation);

    return conversation;
  }
}



