import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from '@app/auth';
import { SignInDto, SignUpDto } from '@app/auth/dto';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@app/auth';
import { ResponseDto } from '@app/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto) {
    const result = await this.authService.signUp(signUpDto);
    return ResponseDto.created(result, 'user_created_successfully');
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto) {
    const result = await this.authService.signIn(signInDto);
    return ResponseDto.success(result, 'login_successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    const result = await this.authService.refreshToken(refreshToken);
    return ResponseDto.success(result, 'token_refreshed_successfully');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = req.user;
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      phone: user.phone,
      createdAt: user.createdAt,
    };
    return ResponseDto.success(userData, 'profile_retrieved_successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    return ResponseDto.success({ user: req.user }, 'current_user_retrieved_successfully');
  }

  // ===== ROLE-BASED EXAMPLES =====

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOnly(@Request() req) {
    return ResponseDto.success(
      { user: req.user },
      'this_endpoint_is_only_accessible_by_ADMIN'
    );
  }

  @Get('page-admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PAGE_ADMIN)
  async pageAdminOnly(@Request() req) {
    return ResponseDto.success(
      { user: req.user },
      'this_endpoint_is_only_accessible_by_PAGE_ADMIN'
    );
  }

  @Get('shop-owner-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER)
  async shopOwnerOnly(@Request() req) {
    return ResponseDto.success(
      { user: req.user },
      'this_endpoint_is_only_accessible_by_SHOP_OWNER'
    );
  }

  @Get('admin-or-page-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PAGE_ADMIN)
  async adminOrPageAdmin(@Request() req) {
    return ResponseDto.success(
      { user: req.user },
      'this_endpoint_is_accessible_by_ADMIN_or_PAGE_ADMIN'
    );
  }

  @Get('all-roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PAGE_ADMIN, UserRole.SHOP_OWNER)
  async allRoles(@Request() req) {
    return ResponseDto.success(
      { user: req.user },
      'this_endpoint_is_accessible_by_all_roles'
    );
  }
}
