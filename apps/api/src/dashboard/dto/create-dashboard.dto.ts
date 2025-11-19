import { IsOptional, IsString } from 'class-validator';

export class CreateDashboardDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  config!: string; // JSON string, parsed in service
}
