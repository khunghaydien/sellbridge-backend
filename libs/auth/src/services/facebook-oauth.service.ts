import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

export interface FacebookUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: {
    data: {
      url: string;
    };
  };
  accessToken: string;
  expiresIn?: number; // Token expiry in seconds
}

@Injectable()
export class FacebookOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env.FACEBOOK_APP_ID || '';
    this.clientSecret = process.env.FACEBOOK_APP_SECRET || '';
    this.redirectUri = 'http://localhost:3030/auth/facebook/callback';
  }

  // Tạo Facebook OAuth URL để redirect user đến Facebook
  getAuthUrl(): string {
    const scope = 'email,public_profile';
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scope,
      response_type: 'code',
      auth_type: 'rerequest',
      display: 'popup',
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  // Xử lý callback từ Facebook OAuth
  async handleCallback(code: string): Promise<FacebookUserInfo> {
    try {
      // Step 1: Exchange authorization code for access token
      const tokenResponse = await axios.get(
        'https://graph.facebook.com/v18.0/oauth/access_token',
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
        'https://graph.facebook.com/v18.0/me',
        {
          params: {
            fields: 'id,name,email,picture',
            access_token: accessToken,
          },
        }
      );

      const userInfo = userResponse.data;

      if (!userInfo.email) {
        throw new UnauthorizedException('facebook_email_not_provided');
      }

      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
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

