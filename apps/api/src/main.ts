import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { ResponseInterceptor, HttpExceptionFilter, AllExceptionsFilter } from '@app/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  
  // Enable cookie parser
  app.use(cookieParser());
  
  // Enable CORS for cookies
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://deploy-railway-production-cb4a.up.railway.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-google-email',
      'x-google-name', 
      'x-google-picture',
      'x-facebook-token'
    ],
    exposedHeaders: ['Set-Cookie'],
  });
  
  // Apply global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Apply global exception filters
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  await app.listen(3030);
}
bootstrap();
