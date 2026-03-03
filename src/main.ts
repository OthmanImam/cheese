import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // production  — error / warn / log   (low noise for ops)
    // development — all levels including debug and verbose
    logger: process.env.NODE_ENV === "production"
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const cs = app.get(ConfigService);

  const nodeEnv = cs.get<string>('NODE_ENV') ?? 'development';
  const port    = parseInt(cs.get<string>('PORT') ?? '3000', 10);

  const allowedOrigins = cs
    .get<string>('ALLOWED_ORIGINS', 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Security headers --------------------------------------------------------
  // Sets X-Content-Type-Options, X-Frame-Options, HSTS, X-XSS-Protection,
  // Referrer-Policy, etc. CSP enabled only in production (Swagger needs
  // inline scripts in dev).
  app.use(helmet({ contentSecurityPolicy: nodeEnv === "production" }));

  // CORS --------------------------------------------------------------------
  // credentials:true is required for the refresh-token cookie exchange.
  // X-Request-ID is exposed so clients can correlate requests to server logs.
  app.enableCors({
    origin:         allowedOrigins,
    credentials:    true,
    methods:        ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  // Global prefix -----------------------------------------------------------
  app.setGlobalPrefix('api/v1');

  // Validation --------------------------------------------------------------
  // whitelist            — strips properties not declared on the DTO
  // forbidNonWhitelisted — 400 on unknown props (explicit contract for consumers)
  // transform            — coerces query params + body to DTO types
  // stopAtFirstError     — false: return all validation errors in one shot
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
      stopAtFirstError:     false,
    }),
  );

  // Class serialiser --------------------------------------------------------
  // Applies @Exclude() on TypeORM entities before JSON serialisation.
  // Strips passwordHash, otpSecret and other sensitive fields from responses.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Graceful shutdown -------------------------------------------------------
  // Lets in-flight requests complete before process exits on SIGTERM.
  // Zero-downtime rolling deploys on Kubernetes / Docker Swarm.
  // NestJS calls onModuleDestroy() on every module and drains the pg pool.
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log('Cheese Wallet API — started');
  logger.log();
  logger.log();
  logger.log('  Global prefix: /api/v1');
  logger.log();
}

bootstrap().catch((err) => {
  // Hard exit on bootstrap failure so container orchestrators detect and restart.
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
