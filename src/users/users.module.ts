import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { EventEmitterModule } from '@nestjs/event-emitter';
import { User } from './users.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // EventEmitter is global — imported at AppModule level
    // Redis (ioredis) is global — imported at AppModule level
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export for AuthModule, etc.
})
export class UsersModule {}
