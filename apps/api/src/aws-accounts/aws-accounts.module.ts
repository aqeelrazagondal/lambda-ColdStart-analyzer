import { Module } from '@nestjs/common';
import { AwsAccountsController } from './aws-accounts.controller';
import { AwsAccountsService } from './aws-accounts.service';
import { OrgsModule } from '../orgs/orgs.module';

@Module({
  imports: [OrgsModule],
  controllers: [AwsAccountsController],
  providers: [AwsAccountsService],
})
export class AwsAccountsModule {}
