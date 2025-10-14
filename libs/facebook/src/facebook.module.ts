import { Module } from '@nestjs/common';
import { FacebookGraphService } from './facebook-graph.service';
import { FacebookGateway } from './facebook.gateway';
import { EncryptionService } from '@app/common';

@Module({
  imports: [],
  providers: [FacebookGraphService, FacebookGateway, EncryptionService],
  exports: [FacebookGraphService, FacebookGateway, EncryptionService],
})
export class FacebookModule {}

