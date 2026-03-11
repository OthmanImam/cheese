import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { ShareEvent, SharePlatform, PLATFORM_POINTS } from './entities/share-event.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
@Processor('share-tracking')
export class ShareProcessor extends WorkerHost {
  private readonly logger = new Logger(ShareProcessor.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ShareEvent)
    private readonly shareRepo: Repository<ShareEvent>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: any): Promise<void> {
    const { shareEventId, userId, platform } = job.data;

    try {
      // Simulate share verification (in real app, this would check social media APIs)
      const isVerified = Math.random() > 0.1; // 90% success rate for demo

      const shareEvent = await this.shareRepo.findOne({
        where: { id: shareEventId },
        relations: ['user'],
      });

      if (!shareEvent) {
        this.logger.warn(`Share event ${shareEventId} not found`);
        return;
      }

      if (isVerified) {
        const points = PLATFORM_POINTS[platform as SharePlatform] ?? 0;
        shareEvent.verified = true;
        shareEvent.pointsAwarded = points;
        shareEvent.user.points += points;

        await this.shareRepo.save(shareEvent);
        await this.userRepo.save(shareEvent.user);

        // Notify user of points awarded
        this.notificationsService.notifyShareVerified(shareEvent.user.id, platform, points).catch(() => {});
      } else {
        shareEvent.verified = false;
        shareEvent.pointsAwarded = 0;
        await this.shareRepo.save(shareEvent);
      }

      this.logger.log(`Share verification completed for user ${userId} on ${platform}`);
    } catch (error) {
      this.logger.error(`Share verification failed for job ${job.id}`, error);
      throw error;
    }
  }
}