import { IsEmail, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  role?: 'owner' | 'admin' | 'viewer';
}
