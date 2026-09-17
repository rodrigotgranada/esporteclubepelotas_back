import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS
  app.enableCors({
    origin: 'http://localhost:7999',
    credentials: true,
  });
  
  // Security
  app.use(helmet());
  
  // Validation and Serialization
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('ECP API')
    .setDescription('Esporte Clube Pelotas API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 7998);
}
bootstrap();
