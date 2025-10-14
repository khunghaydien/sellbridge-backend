import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

@Injectable()
export class GoogleOAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  // Tạo Google OAuth URL để redirect user đến Google
  getAuthUrl(): string {
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3030'}/auth/google/callback`;
    
    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      redirect_uri: redirectUri,
    });

    return authUrl;
  }

  // Xử lý callback từ Google OAuth
  async handleCallback(code: string): Promise<GoogleUserInfo> {
    try {
      const redirectUri = `${process.env.BACKEND_URL}/auth/google/callback`;
      
      // Exchange code for tokens
      const { tokens } = await this.client.getToken({
        code,
        redirect_uri: redirectUri,
      });

      this.client.setCredentials(tokens);

      // Get user info from Google
      const response = await this.client.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      const userInfo = response.data as any;

      if (!userInfo.email || !userInfo.verified_email) {
        throw new UnauthorizedException('google_email_not_verified');
      }

      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.verified_email,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('google_oauth_failed');
    }
  }

}
