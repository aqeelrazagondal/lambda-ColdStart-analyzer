import { Module } from '@nestjs/common';
import { SecretsRotationService } from './secrets-rotation.service';
import { SecretsRotationController } from './secrets-rotation.controller';
import { ConfigModule } from './config.module';
import { PrismaModule } from '../prisma.module';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [ConfigModule, PrismaModule, OrgsModule],
  controllers: [SecretsRotationController],
  providers: [SecretsRotationService],
  exports: [SecretsRotationService],
})
export class SecretsRotationModule {}

