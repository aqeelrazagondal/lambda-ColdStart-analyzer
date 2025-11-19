import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  type!: 'slack' | 'email';

  @IsString()
  target!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
