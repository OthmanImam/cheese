// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  healthCheck() {
    return {
      name: 'Cheese Pay API',
      status: 'online',
      environment: this.config.get('app.nodeEnv'),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}