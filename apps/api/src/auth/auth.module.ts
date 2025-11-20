import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { SecretsService } from '../config/secrets.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [SecretsService],
      useFactory: async (secretsService: SecretsService) => {
        let secret: string;
        try {
          const secretName = process.env.JWT_SECRET_NAME || 'lca/jwt-secret';
          secret = await secretsService.getSecret(secretName);
        } catch (err) {
          // Fallback to environment variable
          secret = process.env.JWT_SECRET || 'dev-secret';
        }
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
