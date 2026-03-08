// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  // ── GET /notifications ────────────────────────────────────
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // ── POST /notifications/read ──────────────────────────────
  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ userId, read: false }, { read: true });
  }

  // ── Internal: create a notification ──────────────────────
  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    deepLink?: string;
  }): Promise<Notification> {
    return this.notifRepo.save(this.notifRepo.create(params));
  }

  // ── Internal: send money received notification ────────────
  async notifyMoneyReceived(
    userId: string,
    amountUsdc: string,
    senderName: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.MONEY,
      title: 'Money Received',
      body: `You received $${parseFloat(amountUsdc).toFixed(2)} USDC from ${senderName}`,
      deepLink: '/history',
    });
  }

  async notifyTransactionComplete(
    userId: string,
    reference: string,
    amountUsdc: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.MONEY,
      title: 'Transfer Complete',
      body: `Your transfer of $${parseFloat(amountUsdc).toFixed(2)} USDC was successful`,
      deepLink: `/history/${reference}`,
    });
  }

  async notifySecurityEvent(userId: string, event: string) {
    return this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Security Alert',
      body: event,
      deepLink: '/profile/devices',
    });
  }
}
