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
    return this.userRepo
      .createQueryBuilder('user')
      .select(['user.username', 'user.points', 'user.createdAt'])
      .where('user.points > 0')
      .orderBy('user.points', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .limit(limit)
      .getRawMany();
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
    const totalUsers = await this.userRepo.count({ where: { points: 0 } });
    const activeUsers = await this.userRepo.count({ where: { points: MoreThan(0) } });
    const totalPoints = await this.userRepo
      .createQueryBuilder('u')
      .select('SUM(u.points)', 'sum')
      .getRawOne();

    return {
      totalUsers,
      activeUsers,
      totalPoints: parseInt(totalPoints.sum) || 0,
    };
  }
}