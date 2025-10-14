import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface FacebookGraphResponse {
  data: any;
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

@Injectable()
export class FacebookGraphService {
  private readonly baseUrl: string = 'https://graph.facebook.com/v23.0';

  /**
   * Get user's Facebook pages with access tokens
   */
  async getUserPages(userAccessToken: string): Promise<FacebookGraphResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: userAccessToken,
          fields: 'id,name,access_token,category,picture'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user pages:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to fetch Facebook pages'
      );
    }
  }

  /**
   * Get page access token for a specific page
   */
  async getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
    try {
      const pagesResponse = await this.getUserPages(userAccessToken);
      
      if (!pagesResponse.data || !Array.isArray(pagesResponse.data)) {
        throw new BadRequestException('No pages found for user');
      }

      const page = pagesResponse.data.find((p: any) => p.id === pageId);
      if (!page) {
        throw new BadRequestException(`Page ${pageId} not found or no access`);
      }

      return page.access_token;
    } catch (error: any) {
      console.error('Error getting page access token:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to get page access token'
      );
    }
  }

  /**
   * Get user's Facebook pages (me/accounts) - Legacy method
   * @param accessToken User's Facebook access token
   * @returns List of pages user manages
   */
  async getUserPagesLegacy(accessToken: string): Promise<FacebookGraphResponse> {
    if (!accessToken) {
      throw new UnauthorizedException('access_token_required');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,tasks',
        },
      });

      return response.data;
    } catch (error: any) {
      // Handle Facebook API errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException({
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          fbtrace_id: fbError.fbtrace_id,
        });
      }

      // Handle network or other errors
      console.error('Facebook API Error:', error.response?.data || error.message);
      throw new BadRequestException('facebook_api_request_failed');
    }
  }

  /**
   * Get page conversations
   * @param pageId Facebook Page ID
   * @param pageAccessToken Page access token
   * @param limit Number of conversations to return (default: 25, max: 100)
   * @param after Cursor for next page
   * @param before Cursor for previous page
   * @returns List of conversations for the page with pagination info
   */
  async getPageConversations(
    pageId: string,
    pageAccessToken: string,
    limit?: number,
    after?: string,
    before?: string,
  ): Promise<FacebookGraphResponse> {
    if (!pageId) {
      throw new BadRequestException('page_id_required');
    }

    if (!pageAccessToken) {
      throw new UnauthorizedException('page_access_token_required');
    }

    try {
      const params: any = {
        access_token: pageAccessToken,
        fields: 'id,link,updated_time,message_count,unread_count,participants,senders,snippet',
      };

      // Add pagination parameters if provided
      if (limit) {
        params.limit = Math.min(limit, 100); // Max 100 per request
      }
      if (after) {
        params.after = after;
      }
      if (before) {
        params.before = before;
      }

      const response = await axios.get(`${this.baseUrl}/${pageId}/conversations`, {
        params,
      });

      return response.data;
    } catch (error: any) {
      // Handle Facebook API errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException({
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          fbtrace_id: fbError.fbtrace_id,
        });
      }

      // Handle network or other errors
      console.error('Facebook API Error:', error.response?.data || error.message);
      throw new BadRequestException('facebook_api_request_failed');
    }
  }

  /**
   * Get messages from a specific conversation
   * @param conversationId Conversation ID
   * @param pageAccessToken Page access token
   * @param limit Number of messages to return (default: 25, max: 100)
   * @param after Cursor for next page
   * @param before Cursor for previous page
   * @returns List of messages in the conversation with pagination info
   */
  async getConversationMessages(
    conversationId: string,
    pageAccessToken: string,
    limit?: number,
    after?: string,
    before?: string,
  ): Promise<FacebookGraphResponse> {
    if (!conversationId) {
      throw new BadRequestException('conversation_id_required');
    }

    if (!pageAccessToken) {
      throw new UnauthorizedException('page_access_token_required');
    }

    try {
      const params: any = {
        access_token: pageAccessToken,
        fields: 'id,created_time,from,to,message,attachments{id,image_data,mime_type,name,size,video_data}',
      };

      // Add pagination parameters if provided
      if (limit) {
        params.limit = Math.min(limit, 100); // Max 100 per request
      }
      if (after) {
        params.after = after;
      }
      if (before) {
        params.before = before;
      }

      const response = await axios.get(`${this.baseUrl}/${conversationId}/messages`, {
        params,
      });

      return response.data;
    } catch (error: any) {
      // Handle Facebook API errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException({
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          fbtrace_id: fbError.fbtrace_id,
        });
      }

      // Handle network or other errors
      console.error('Facebook API Error:', error.response?.data || error.message);
      throw new BadRequestException('facebook_api_request_failed');
    }
  }

  /**
   * Send a message using Facebook Send API
   * @param pageId Facebook Page ID
   * @param recipientId Recipient PSID (Page Scoped ID)
   * @param message Message text to send
   * @param pageAccessToken Page access token
   * @returns Sent message data
   */
  async sendMessage(
    pageId: string,
    recipientId: string,
    message: string,
    pageAccessToken: string,
  ): Promise<FacebookGraphResponse> {
    if (!pageId) {
      throw new BadRequestException('page_id_required');
    }

    if (!recipientId) {
      throw new BadRequestException('recipient_id_required');
    }

    if (!message || message.trim() === '') {
      throw new BadRequestException('message_required');
    }

    if (!pageAccessToken) {
      throw new UnauthorizedException('page_access_token_required');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${pageId}/messages`,
        {
          recipient: {
            id: recipientId,
          },
          message: {
            text: message.trim(),
          },
        },
        {
          params: {
            access_token: pageAccessToken,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      // Handle Facebook API errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException({
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          fbtrace_id: fbError.fbtrace_id,
        });
      }

      // Handle network or other errors
      console.error('Facebook API Error:', error.response?.data || error.message);
      throw new BadRequestException('facebook_api_send_message_failed');
    }
  }

  /**
   * Create a post on Facebook Page feed
   * @param pageId Facebook Page ID
   * @param message Post message/content
   * @param pageAccessToken Page access token
   * @param link Optional link to share
   * @param published Optional publish status (default: true)
   * @returns Created post data
   */
  async createPost(
    pageId: string,
    message: string,
    pageAccessToken: string,
    link?: string,
    published?: string,
  ): Promise<FacebookGraphResponse> {
    if (!pageId) {
      throw new BadRequestException('page_id_required');
    }

    if (!message || message.trim() === '') {
      throw new BadRequestException('message_required');
    }

    if (!pageAccessToken) {
      throw new UnauthorizedException('page_access_token_required');
    }

    try {
      const postData: any = {
        message: message.trim(),
      };

      if (link) {
        postData.link = link;
      }

      if (published !== undefined) {
        postData.published = published;
      }

      const response = await axios.post(
        `${this.baseUrl}/${pageId}/feed`,
        postData,
        {
          params: {
            access_token: pageAccessToken,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      // Handle Facebook API errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException({
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          fbtrace_id: fbError.fbtrace_id,
        });
      }

      // Handle network or other errors
      console.error('Facebook API Error:', error.response?.data || error.message);
      throw new BadRequestException('facebook_api_create_post_failed');
    }
  }

  /**
   * Create a photo post on Facebook Page
   * @param pageId Facebook Page ID
   * @param pageAccessToken Page access token
   * @param caption Optional caption/message (can include hashtags)
   * @param photoUrl Photo URL (for posting from URL)
   * @param photoBuffer Photo buffer (for uploading file)
   * @param published Optional publish status (default: true)
   * @returns Created photo post data
   */
  async createPhotoPost(
    pageId: string,
    pageAccessToken: string,
    caption?: string,
    photoUrl?: string,
    photoBuffer?: Buffer,
    published?: string,
  ): Promise<FacebookGraphResponse> {
    if (!pageId) {
      throw new BadRequestException('page_id_required');
    }

    if (!photoUrl && !photoBuffer) {
      throw new BadRequestException('photo_url_or_file_required');
    }

    if (!pageAccessToken) {
      throw new UnauthorizedException('page_access_token_required');
    }

    try {
      const postData: any = {};

      if (caption) {
        postData.caption = caption.trim();
      }

      if (published !== undefined) {
        postData.published = published;
      }

      let response;

      if (photoUrl) {
        // Post photo from URL
        postData.url = photoUrl;
        response = await axios.post(
          `${this.baseUrl}/${pageId}/photos`,
          postData,
          {
            params: {
              access_token: pageAccessToken,
            },
          },
        );
      } else if (photoBuffer) {
        // Upload photo from buffer using FormData
        const FormData = require('form-data');
        const formData = new FormData();
        
        formData.append('source', photoBuffer, {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });

        if (caption) {
          formData.append('caption', caption.trim());
        }

        if (published !== undefined) {
          formData.append('published', published);
        }

        response = await axios.post(
          `${this.baseUrl}/${pageId}/photos`,
          formData,
          {
            params: {
              access_token: pageAccessToken,
            },
            headers: {
              ...formData.getHeaders(),
            },
          },
        );
      }

      return response.data;
    } catch (error: any) {
      // Handle Facebook API errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        throw new BadRequestException({
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          fbtrace_id: fbError.fbtrace_id,
        });
      }

      // Handle network or other errors
      console.error('Facebook API Error:', error.response?.data || error.message);
      throw new BadRequestException('facebook_api_create_photo_post_failed');
    }
  }
}

