import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

export interface FacebookUserInfo {
  id: string;
  name: string;
  accessToken: string;
  expiresIn?: number; // Token expiry in seconds
}

@Injectable()
export class FacebookOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env.FACEBOOK_CLIENT_ID || '';
    this.clientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
    this.redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3030'}/auth/facebook/callback`;
  }

  // Tạo Facebook OAuth URL để redirect user đến Facebook
  getAuthUrl(): string {
    const scope = 'pages_show_list,pages_manage_cta,pages_manage_instant_articles,pages_show_list,read_page_mailboxes,ads_management,ads_read,business_management,pages_messaging,pages_messaging_phone_number,pages_messaging_subscriptions,attribution_read,page_events,pages_read_engagement,pages_manage_metadata,pages_read_user_content,pages_manage_ads,pages_manage_posts,pages_manage_engagement,instagram_manage_events,manage_app_solution,pages_utility_messaging,public_profile';

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scope,
      response_type: 'code',
      auth_type: 'rerequest',
      display: 'popup',
    });

    return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
  }

  // Xử lý callback từ Facebook OAuth
  async handleCallback(code: string): Promise<FacebookUserInfo> {
    try {
      // Step 1: Exchange authorization code for access token
      const tokenResponse = await axios.get(
        'https://graph.facebook.com/v23.0/oauth/access_token',
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            code: code,
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in; // Token expiry in seconds

      if (!accessToken) {
        throw new UnauthorizedException('facebook_access_token_missing');
      }

      // Step 2: Get user info from Facebook
      const userResponse = await axios.get(
        'https://graph.facebook.com/v23.0/me',
        {
          params: {
            fields: 'id,name',
            access_token: accessToken,
          },
        }
      );

      const userInfo = userResponse.data;

      return {
        id: userInfo.id,
        name: userInfo.name || 'Facebook User',
        accessToken: accessToken,
        expiresIn: expiresIn,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log error for debugging
      console.error('Facebook OAuth Error:', error.response?.data || error.message);

      throw new UnauthorizedException('facebook_oauth_failed');
    }
  }
}

