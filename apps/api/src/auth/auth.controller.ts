import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Req, Delete, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from './public.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private getIpAddress(req: any): string | undefined {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress
    );
  }

  private getUserAgent(req: any): string | undefined {
    return req.headers['user-agent'];
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @AuditLog({ action: 'user.register', includeRequestBody: true })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.auth.register(dto, this.getIpAddress(req), this.getUserAgent(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @AuditLog({ action: 'user.login', includeRequestBody: true })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, this.getIpAddress(req), this.getUserAgent(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    return this.auth.refresh(dto.refreshToken, this.getIpAddress(req), this.getUserAgent(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @AuditLog({ action: 'user.logout' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.auth.getSessions(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @AuditLog({ action: 'session.revoke', resourceType: 'session' })
  @Delete('sessions/:sessionId')
  async revokeSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    await this.auth.revokeSession(sessionId, req.user.userId);
    return { message: 'Session revoked successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @AuditLog({ action: 'session.revoke_all' })
  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Req() req: any) {
    await this.auth.revokeAllUserTokens(req.user.userId);
    return { message: 'All sessions revoked successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions/user/:userId')
  @AuditLog({ action: 'session.view_user_sessions', resourceType: 'session' })
  async getUserSessions(@Param('userId') userId: string, @Req() req: any) {
    // Admin can view any user's sessions if they're in the same org
    return this.auth.getUserSessionsForAdmin(userId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @AuditLog({ action: 'session.revoke_by_admin', resourceType: 'session' })
  @Delete('sessions/:sessionId/admin')
  async revokeSessionByAdmin(@Param('sessionId') sessionId: string, @Req() req: any) {
    await this.auth.revokeSessionByAdmin(sessionId, req.user.userId);
    return { message: 'Session revoked successfully' };
  }
}
