import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { TokenPair } from '@app/auth';

@Injectable()
export class CookieService {
  private readonly COOKIE_CONFIG = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };

  private readonly ACCESS_TOKEN_CONFIG = {
    ...this.COOKIE_CONFIG,
    maxAge: 15 * 60 * 1000, // 15 minutes
  };

  private readonly REFRESH_TOKEN_CONFIG = {
    ...this.COOKIE_CONFIG,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  setTokens(res: Response, tokens: TokenPair): void {
    res.cookie('accessToken', tokens.accessToken, this.ACCESS_TOKEN_CONFIG);
    res.cookie('refreshToken', tokens.refreshToken, this.REFRESH_TOKEN_CONFIG);
  }

  setAccessToken(res: Response, accessToken: string): void {
    res.cookie('accessToken', accessToken, this.ACCESS_TOKEN_CONFIG);
  }

  clearTokens(res: Response): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }

  clearAccessToken(res: Response): void {
    res.clearCookie('accessToken');
  }

  clearRefreshToken(res: Response): void {
    res.clearCookie('refreshToken');
  }
}
