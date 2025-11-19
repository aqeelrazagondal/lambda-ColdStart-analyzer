import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAwsAccountDto {
  @IsString()
  @Length(12, 12)
  awsAccountId!: string; // numeric string length 12

  @IsString()
  roleArn!: string;

  @IsString()
  externalId!: string;

  @IsOptional()
  @IsString()
  defaultRegion?: string;
}
