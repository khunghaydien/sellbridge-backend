import { Module } from '@nestjs/common';
import { AuthModule as LibAuthModule } from '@app/auth';
import { AuthController } from './auth.controller';

@Module({
  imports: [LibAuthModule],
  controllers: [AuthController],
})
export class AuthModule {}
