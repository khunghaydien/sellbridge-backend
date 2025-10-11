import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @IsNotEmpty()
  @IsString()
  pageAccessToken: string;
}

