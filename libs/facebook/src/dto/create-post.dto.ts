import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsUrl()
  link?: string;

  @IsOptional()
  @IsString()
  published?: string; // 'true' or 'false' - default is 'true'

  @IsNotEmpty()
  @IsString()
  pageAccessToken: string;
}

export class CreatePhotoPostDto {
  @IsOptional()
  @IsString()
  caption?: string; // Message/caption for the photo (can include hashtags)

  @IsOptional()
  @IsUrl()
  url?: string; // Photo URL if posting from URL

  @IsOptional()
  @IsString()
  published?: string; // 'true' or 'false' - default is 'true'

  @IsNotEmpty()
  @IsString()
  pageAccessToken: string;
}

