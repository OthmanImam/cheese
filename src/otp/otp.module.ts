// src/otp/otp.module.ts
import { Module }        from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailModule }   from '../email/email.module'
import { Otp }           from './entities/otp.entity'
import { OtpService }    from './otp.service'

@Module({
  imports:   [TypeOrmModule.forFeature([Otp]), EmailModule],
  providers: [OtpService],
  exports:   [OtpService],
})
export class OtpModule {}
