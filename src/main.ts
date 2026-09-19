import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Segurança da Borda
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:7999',
    credentials: true, // Necessário para enviar cookies (Refresh Token)
  });

  // Observabilidade
  app.useLogger(app.get(Logger));

  // Validação Global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Parse de Cookies
  app.use(cookieParser());

  // Serialização Global (Prevenção de vazamento de dados via @Exclude)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Graceful shutdown
  app.enableShutdownHooks();

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Esporte Clube Pelotas API')
    .setDescription('Documentação oficial da API do EC Pelotas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend is running on port ${port}`);
}
bootstrap();
