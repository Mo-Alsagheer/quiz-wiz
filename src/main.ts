import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security HTTP Headers
  app.use(helmet());

  // Global prefix & URI Versioning (/api/v1/...)
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Safe CORS Configuration (Prevent wildcard origin with credentials: true)
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS');
  const origins =
    allowedOrigins && allowedOrigins.trim().length > 0
      ? allowedOrigins.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'];

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'X-Requested-With',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Global Pipes, Filters, Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('QuizWiz API')
    .setDescription(
      'Quiz Management & Assessment Platform Backend API Specification',
    )
    .setVersion('1.0')
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Groups', 'Group management endpoints')
    .addTag('Questions', 'Question bank management endpoints')
    .addTag('Quizzes', 'Quiz management and code generation endpoints')
    .addTag('Dashboard', 'Learner and Instructor dashboard metrics & analytics')
    .addTag('Results', 'Quiz results and performance analytics')
    .addTag(
      'Quiz Attempts',
      'Quiz participation, live sessions, and submission endpoints',
    )
    .addTag('Students', 'Student management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'bearer-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 QuizWiz Server running on: http://localhost:${port}/api/v1`);
  console.log(
    `📚 Swagger Docs available at: http://localhost:${port}/api/v1/docs`,
  );
}
bootstrap();
