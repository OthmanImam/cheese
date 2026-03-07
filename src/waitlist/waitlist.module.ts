// src/waitlist/waitlist.module.ts
import { Module }        from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User }          from '../auth/entities/user.entity'
import { EmailModule }   from '../email/email.module'
import { WaitlistController } from './waitlist.controller'
import { WaitlistService }    from './waitlist.service'
import { WaitlistEntry }      from './entities/waitlist-entry.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry, User]),
    EmailModule,
  ],
  controllers: [WaitlistController],
  providers:   [WaitlistService],
  exports:     [WaitlistService],
})
export class WaitlistModule {}
