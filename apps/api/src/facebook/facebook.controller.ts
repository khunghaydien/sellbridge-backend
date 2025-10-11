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
} from '@nestjs/common';
import { FacebookGraphService, SendMessageDto } from '@app/facebook';
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
   * Get user's Facebook pages (me/accounts)
   * GET /facebook/pages
   */
  @Get('pages')
  async getUserPages(@Request() req) {
    const accessToken = 'EAAKhp771dKkBPtwqwSfj0Up3bIEF9r8RVaBqdxP8YYhkpRtlbutG6C90QvgesygLOYEIHCa3A8EvHqybgDM4JCPRNsPCK4ARsY8jAVx2b7pMb7q0yAZCPLb1H0oDUL0QzxuRCWra7euJ3xMDQeRU2zqRsGBjHHcvOOKrNZBaTZAKwg0AvajFqSOeq36z4dBP0g6OX1JAITr5MqXvSmi52Ab3gE2wqXL'
    const result = await this.facebookGraphService.getUserPages(accessToken);
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
}

