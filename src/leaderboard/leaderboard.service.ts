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
    // Get users with points
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select(['user.username', 'user.points', 'user.createdAt'])
      .where('user.points > 0 AND user.isFlagged = false')
      .orderBy('user.points', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .limit(limit)
      .getMany();

    // Get waitlist entries with points
    const waitlistEntries = await this.waitlistRepo
      .createQueryBuilder('waitlist')
      .select(['waitlist.username', 'waitlist.points', 'waitlist.createdAt'])
      .where('waitlist.points > 0')
      .orderBy('waitlist.points', 'DESC')
      .addOrderBy('waitlist.createdAt', 'ASC')
      .limit(limit)
      .getMany();

    // Combine and sort all entries
    const allEntries = [
      ...users.map(u => ({ username: u.username, points: u.points, createdAt: u.createdAt, isUser: true })),
      ...waitlistEntries.map(w => ({ username: w.username, points: w.points, createdAt: w.createdAt, isUser: false })),
    ];

    // Sort by points descending, then by creation date ascending
    allEntries.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return allEntries.slice(0, limit).map(entry => ({
      username: entry.username,
      points: entry.points,
      createdAt: entry.createdAt,
    }));
  }

  async getUserRank(username: string) {
    // First check if it's a registered user
    let user = await this.userRepo.findOne({
      where: { username },
      select: ['id', 'points', 'createdAt', 'isFlagged'],
    });

    let isWaitlistUser = false;
    if (!user) {
      // Check if it's a waitlist user
      const waitlistEntry = await this.waitlistRepo.findOne({
        where: { username },
        select: ['id', 'points', 'createdAt'],
      });
      if (waitlistEntry) {
        user = waitlistEntry as any; // Type compatibility
        isWaitlistUser = true;
      }
    }

    if (!user) return null;

    // Skip flagged users
    if (!isWaitlistUser && (user as any).isFlagged) return null;

    // Count users/waitlist entries with higher points
    const userHigherCount = await this.userRepo
      .createQueryBuilder('u')
      .where('u.points > :points', { points: user.points })
      .orWhere('u.points = :points AND u.createdAt < :createdAt', {
        points: user.points,
        createdAt: user.createdAt,
      })
      .andWhere('u.isFlagged = false')
      .getCount();

    const waitlistHigherCount = await this.waitlistRepo
      .createQueryBuilder('w')
      .where('w.points > :points', { points: user.points })
      .orWhere('w.points = :points AND w.createdAt < :createdAt', {
        points: user.points,
        createdAt: user.createdAt,
      })
      .getCount();

    return {
      rank: userHigherCount + waitlistHigherCount + 1,
    };
  }
}