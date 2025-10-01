import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { ResponseInterceptor, HttpExceptionFilter, AllExceptionsFilter } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  
  // Apply global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Apply global exception filters
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  await app.listen(3030);
}
bootstrap();
