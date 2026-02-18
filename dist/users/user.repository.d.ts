import { User, UserStatus } from './users.entity';
import { Repository } from 'typeorm';
export declare class UserRepository extends Repository<User> {
    findByEmailWithDeleted(email: string): Promise<User | null>;
    findActiveByMerchant(merchantId: string): Promise<User[]>;
    countByStatus(): Promise<Record<UserStatus, number>>;
}
