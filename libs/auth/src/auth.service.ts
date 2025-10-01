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
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
    const { email, password, username } = signUpDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('email_already_exists');
      }
      throw new ConflictException('username_already_exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      status: 'active',
      role: 'shop_owner',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async signIn(signInDto: SignInDto): Promise<AuthResponse> {
    const { email, password } = signInDto;

    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('invalid_credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('account_is_not_active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('invalid_credentials');
    }

    // Update last login
    user.lastLoginAt = Date.now();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
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
        throw new UnauthorizedException('Invalid token type');
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
