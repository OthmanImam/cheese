import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
      select: ['id', 'points'],
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

  async getStats() {
    // Count all users (not just those with 0 points)
    const totalUsers = await this.userRepo.count();
    // Count users with points > 0
    const activeUsers = await this.userRepo.count({ where: { points: MoreThan(0) } });
    // Sum all points
    const totalPointsResult = await this.userRepo
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u.points), 0)', 'sum')
      .getRawOne();

    return {
      totalUsers,
      activeUsers,
      totalPoints: parseInt(totalPointsResult?.sum || '0') || 0,
    };
  }
}