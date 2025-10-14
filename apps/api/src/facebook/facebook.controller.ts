import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  UnauthorizedException,
  Param,
  Query,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FacebookGraphService, SendMessageDto, CreatePostDto, CreatePhotoPostDto } from '@app/facebook';
import { ResponseDto, EncryptionService } from '@app/common';
import { JwtAuthGuard } from '@app/auth';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@app/database/entities/user.entity';

@Controller('facebook')
@UseGuards(JwtAuthGuard)
export class FacebookController {
  constructor(
    private readonly facebookGraphService: FacebookGraphService,
    private readonly encryptionService: EncryptionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get user's Facebook pages with access tokens
   */
  @Get('pages')
  async getUserPages(@Request() req) {
    const user = req.user;
    
    if (!user.facebookAccessToken) {
      throw new BadRequestException('user_facebook_not_connected');
    }

    // Decrypt Facebook access token
    const decryptedToken = this.encryptionService.decrypt(user.facebookAccessToken);
    
    try {
      const pagesResponse = await this.facebookGraphService.getUserPages(decryptedToken);
      
      return ResponseDto.success(pagesResponse.data, 'pages_fetched_successfully');
    } catch (error) {
      throw new BadRequestException(error.message || 'failed_to_fetch_pages');
    }
  }

  /**
   * Helper method to get user's Facebook access token from database
   * @param userId User ID from JWT
   * @returns Decrypted Facebook access token
   */
  private async getUserFacebookToken(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'facebookAccessToken', 'facebookTokenExpiresAt'],
    });

    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    if (!user.facebookAccessToken) {
      throw new UnauthorizedException('facebook_not_connected');
    }

    // Check if token is expired
    if (user.facebookTokenExpiresAt && user.facebookTokenExpiresAt < Date.now()) {
      throw new UnauthorizedException('facebook_token_expired');
    }

    // Decrypt the token
    try {
      return this.encryptionService.decrypt(user.facebookAccessToken);
    } catch (error) {
      throw new UnauthorizedException('facebook_token_invalid');
    }
  }

  /**
   * Get user's Facebook pages (me/accounts) - Legacy endpoint
   * GET /facebook/pages/legacy
   */
  @Get('pages/legacy')
  async getUserPagesLegacy(@Request() req) {
    const accessToken = await this.getUserFacebookToken(req.user.id);
    const result = await this.facebookGraphService.getUserPagesLegacy(accessToken);
    return ResponseDto.success(result, 'facebook_pages_retrieved');
  }

  /**
   * Get conversations for a specific Facebook page
   * GET /facebook/pages/:pageId/conversations?pageAccessToken=xxx&limit=25&after=xxx
   * 
   * Query params:
   * - pageAccessToken: Page access token (required)
   * - limit: Number of conversations per page (optional, default: 25, max: 100)
   * - after: Cursor for next page (optional, for load more)
   * - before: Cursor for previous page (optional)
   */
  @Get('pages/:pageId/conversations')
  async getPageConversations(
    @Request() req,
    @Param('pageId') pageId: string,
    @Query('pageAccessToken') pageAccessToken: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ) {
    if (!pageAccessToken) {
      throw new BadRequestException('page_access_token_required');
    }

    const result = await this.facebookGraphService.getPageConversations(
      pageId,
      pageAccessToken,
      limit ? parseInt(limit, 10) : undefined,
      after,
      before,
    );
    return ResponseDto.success(result, 'page_conversations_retrieved');
  }

  /**
   * Get messages from a specific conversation
   * GET /facebook/conversations/:conversationId/messages?pageAccessToken=xxx&limit=25&after=xxx
   * 
   * Query params:
   * - pageAccessToken: Page access token (required)
   * - limit: Number of messages per page (optional, default: 25, max: 100)
   * - after: Cursor for next page (optional, for load more)
   * - before: Cursor for previous page (optional)
   */
  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('pageAccessToken') pageAccessToken: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ) {
    if (!pageAccessToken) {
      throw new BadRequestException('page_access_token_required');
    }

    const result = await this.facebookGraphService.getConversationMessages(
      conversationId,
      pageAccessToken,
      limit ? parseInt(limit, 10) : undefined,
      after,
      before,
    );
    return ResponseDto.success(result, 'conversation_messages_retrieved');
  }

  /**
   * Send a message using Facebook Send API
   * POST /facebook/pages/:pageId/messages
   * 
   * Body:
   * {
   *   "recipientId": "PSID of recipient",
   *   "message": "Text message to send",
   *   "pageAccessToken": "Page access token"
   * }
   */
  @Post('pages/:pageId/messages')
  async sendMessage(
    @Request() req,
    @Param('pageId') pageId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    const result = await this.facebookGraphService.sendMessage(
      pageId,
      sendMessageDto.recipientId,
      sendMessageDto.message,
      sendMessageDto.pageAccessToken,
    );
    return ResponseDto.success(result, 'message_sent_successfully');
  }

  /**
   * Create a post on Facebook Page feed
   * POST /facebook/pages/:pageId/feed
   * 
   * Body:
   * {
   *   "message": "Post content/message",
   *   "link": "https://example.com" (optional),
   *   "published": "true" (optional, default: true),
   *   "pageAccessToken": "Page access token"
   * }
   */
  @Post('pages/:pageId/feed')
  async createPost(
    @Request() req,
    @Param('pageId') pageId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    const result = await this.facebookGraphService.createPost(
      pageId,
      createPostDto.message,
      createPostDto.pageAccessToken,
      createPostDto.link,
      createPostDto.published,
    );
    return ResponseDto.success(result, 'post_created_successfully');
  }

  /**
   * Create a photo post on Facebook Page
   * POST /facebook/pages/:pageId/photos
   * 
   * Body (JSON):
   * {
   *   "caption": "Beautiful sunset 🌅 #nature #photography",
   *   "url": "https://example.com/photo.jpg",
   *   "published": "true" (optional),
   *   "pageAccessToken": "Page access token"
   * }
   */
  @Post('pages/:pageId/photos')
  async createPhotoPost(
    @Request() req,
    @Param('pageId') pageId: string,
    @Body() createPhotoPostDto: CreatePhotoPostDto,
  ) {
    const result = await this.facebookGraphService.createPhotoPost(
      pageId,
      createPhotoPostDto.pageAccessToken,
      createPhotoPostDto.caption,
      createPhotoPostDto.url,
      undefined,
      createPhotoPostDto.published,
    );
    return ResponseDto.success(result, 'photo_post_created_successfully');
  }

  /**
   * Upload and create a photo post on Facebook Page
   * POST /facebook/pages/:pageId/photos/upload
   * Content-Type: multipart/form-data
   * 
   * Form fields:
   * - photo: Image file
   * - caption: Caption text (optional, can include hashtags)
   * - published: 'true' or 'false' (optional)
   * - pageAccessToken: Page access token
   */
  @Post('pages/:pageId/photos/upload')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhotoPost(
    @Request() req,
    @Param('pageId') pageId: string,
    @UploadedFile() photo: Express.Multer.File,
    @Body('caption') caption?: string,
    @Body('published') published?: string,
    @Body('pageAccessToken') pageAccessToken?: string,
  ) {
    if (!photo) {
      throw new BadRequestException('photo_file_required');
    }

    if (!pageAccessToken) {
      throw new BadRequestException('page_access_token_required');
    }

    const result = await this.facebookGraphService.createPhotoPost(
      pageId,
      pageAccessToken,
      caption,
      undefined,
      photo.buffer,
      published,
    );
    return ResponseDto.success(result, 'photo_uploaded_successfully');
  }
}

