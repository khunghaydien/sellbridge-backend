import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacebookGraphService } from './facebook-graph.service';
import { User } from '@app/database/entities/user.entity';
import { EncryptionService } from '@app/common';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [FacebookGraphService, EncryptionService],
  exports: [FacebookGraphService, EncryptionService, TypeOrmModule],
})
export class FacebookModule {}

