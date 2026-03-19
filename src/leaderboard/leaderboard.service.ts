import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { WaitlistEntry } from '../waitlist/entities/waitlist-entry.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
  ) {}

  async getTopUsers(limit: number = 100) {
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select(['user.username', 'user.points', 'user.createdAt'])
      .where('user.points > 0')
      .orderBy('user.points', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .limit(limit)
      .getMany();
    
    return users.map(u => ({
      username: u.username,
      points: u.points,
      createdAt: u.createdAt,
    }));
  }

  async getUserRank(username: string) {
    const user = await this.userRepo.findOne({
      where: { username },
      select: ['id', 'points', 'createdAt'],
    });
    if (!user) return null;

    const higherCount = await this.userRepo
      .createQueryBuilder('u')
      .where('u.points > :points', { points: user.points })
      .orWhere('u.points = :points AND u.createdAt < :createdAt', {
        points: user.points,
        createdAt: user.createdAt,
      })
      .getCount();

    return {
      rank: higherCount + 1,
      points: user.points,
      username,
    };
  }

  async getWaitlistLeaderboard(limit: number = 100) {
    const entries = await this.userRepo.manager
      .createQueryBuilder(WaitlistEntry, 'entry')
      .select(['entry.username', 'entry.position', 'entry.createdAt'])
      .where('entry.position IS NOT NULL')
      .orderBy('entry.position', 'ASC')
      .limit(limit)
      .getMany();

    return entries.map(e => ({
      username: e.username,
      position: e.position,
      createdAt: e.createdAt,
    }));
  }

  async getWaitlistPosition(username: string) {
    const entry = await this.waitlistRepo.findOne({
      where: { username },
      select: ['position'],
    });
    return entry?.position || null;
  }
}