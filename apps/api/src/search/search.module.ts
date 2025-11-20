import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OrgsModule } from '../orgs/orgs.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule, OrgsModule],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}

