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
  const allowedOrigins = [
    (process.env.FRONTEND_URL || 'http://localhost:7999').replace(/\/$/, ''),
    'http://localhost:7999',
    'http://127.0.0.1:7999',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
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
void bootstrap();
