import { Injectable, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SecretsService } from '../config/secrets.service';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) implements OnModuleInit {
  private secret: string;

  constructor(private secretsService: SecretsService) {
    // Initialize with fallback, will be updated in onModuleInit
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
    this.secret = process.env.JWT_SECRET || 'dev-secret';
  }

  async onModuleInit() {
    // Load secret from Secrets Manager if available
    try {
      const secretName = process.env.JWT_SECRET_NAME || 'lca/jwt-secret';
      this.secret = await this.secretsService.getSecret(secretName);
      // Update the strategy's secret
      (this as any).secretOrKey = this.secret;
    } catch (err) {
      // Keep fallback secret
      this.secret = process.env.JWT_SECRET || 'dev-secret';
    }
  }

  async validate(payload: JwtPayload) {
    // Attach minimal user context to request
    return { userId: payload.sub, email: payload.email };
  }
}
