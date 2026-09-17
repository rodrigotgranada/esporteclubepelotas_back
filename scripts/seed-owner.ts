import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../src/modules/users/schemas/user.schema.js';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('🌱 Iniciando Database Seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  
  const ownerEmail = 'admin@ecpelotas.com.br';
  const existingOwner = await userModel.findOne({ email: ownerEmail });
  
  if (existingOwner) {
    console.log('⚠️ Usuário Owner já existe. Nenhuma ação necessária.');
  } else {
    const password = 'SuperSecretPassword123!';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    await userModel.create({
      name: 'Owner Admin',
      email: ownerEmail,
      passwordHash,
      role: UserRole.OWNER,
      isActive: true,
    });
    console.log(`✅ Owner criado com sucesso!`);
    console.log(`📧 Email: ${ownerEmail}`);
    console.log(`🔑 Senha: ${password}`);
  }
  
  await app.close();
  process.exit(0);
}

bootstrap();
