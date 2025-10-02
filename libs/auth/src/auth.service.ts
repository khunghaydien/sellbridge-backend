import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@app/database/entities/user.entity';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { GoogleOAuthService, GoogleUserInfo } from './services/google-oauth.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private googleOAuthService: GoogleOAuthService,
  ) { }

  private async createUser(signUpDto: SignUpDto): Promise<AuthResponse> {
    const { email, password, username } = signUpDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
    });
    await this.userRepository.save(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
    const { email, username } = signUpDto;
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('email_already_exists');
      }
      throw new ConflictException('username_already_exists');
    }
    return await this.createUser(signUpDto);
  }

  async signIn(signInDto: SignInDto): Promise<AuthResponse> {
    const { email, password } = signInDto;
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('invalid_credentials');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('account_is_not_active');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('invalid_credentials');
    }
    user.lastLoginAt = Date.now();
    await this.userRepository.save(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('invalid_token_type');
      }
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('user_not_found_or_inactive');
      }
      const accessToken = await this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('invalid_refresh_token');
    }
  }

  async generateTokensForUser(userId: string): Promise<TokenPair> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('user_not_found_or_inactive');
    }
    return this.generateTokens(user);
  }

  async handleGoogleUser(googleUserInfo: GoogleUserInfo): Promise<AuthResponse> {
    const { email, name } = googleUserInfo;
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      const createUserDto: SignUpDto = {
        email,
        username: name,
        password: '123456',
      };
      return await this.createUser(createUserDto);
    }
    user.lastLoginAt = Date.now();
    await this.userRepository.save(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  getGoogleAuthUrl(): string {
    return this.googleOAuthService.getAuthUrl();
  }

  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    const googleUserInfo = await this.googleOAuthService.handleCallback(code);
    return this.handleGoogleUser(googleUserInfo);
  }


  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });
  }
}
