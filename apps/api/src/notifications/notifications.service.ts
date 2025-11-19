import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ActivityService } from '../activity/activity.service';

interface NotificationPayload {
  title: string;
  message: string;
  severity?: string;
  url?: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly activity: ActivityService) {}

  list(orgId: string) {
    return this.prisma.notificationChannel.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
  }

  create(orgId: string, dto: CreateChannelDto) {
    return this.prisma.notificationChannel.create({
      data: {
        orgId,
        type: dto.type,
        target: dto.target,
        description: dto.description,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async update(orgId: string, id: string, dto: UpdateChannelDto) {
    const existing = await this.prisma.notificationChannel.findFirst({ where: { id, orgId } });
    if (!existing) throw new NotFoundException('Channel not found');
    return this.prisma.notificationChannel.update({
      where: { id },
      data: {
        target: dto.target ?? existing.target,
        description: dto.description ?? existing.description,
        enabled: dto.enabled ?? existing.enabled,
      },
    });
  }

  async remove(orgId: string, id: string) {
    const existing = await this.prisma.notificationChannel.findFirst({ where: { id, orgId } });
    if (!existing) throw new NotFoundException('Channel not found');
    await this.prisma.notificationChannel.delete({ where: { id } });
    return { ok: true };
  }

  async notify(orgId: string, payload: NotificationPayload) {
    const channels = await this.prisma.notificationChannel.findMany({ where: { orgId, enabled: true } });
    if (channels.length === 0) return;
    await Promise.all(
      channels.map(async (channel) => {
        try {
          if (channel.type === 'slack') {
            await fetch(channel.target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: `*${payload.title}*\n${payload.message}` }),
            });
          } else if (channel.type === 'email') {
            await this.activity.record({
              orgId,
              type: 'notification_email',
              message: `Email notification queued: ${payload.title}`,
              payload: payload.data || payload,
            });
          }
        } catch (err) {
          console.warn('Notification dispatch failed', err);
        }
      })
    );
  }
}
