import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from '../modules/users/schemas/user.schema.js';
import { Role, RoleDocument } from '../modules/roles/schemas/role.schema.js';
import { SystemModule, SystemModuleDocument } from '../modules/system-modules/schemas/system-module.schema.js';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('🌱 Iniciando Database Seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
  const moduleModel = app.get<Model<SystemModuleDocument>>(getModelToken(SystemModule.name));

  // 1. Seed Modules
  const modules = [
    { name: 'Usuários', slug: 'users', description: 'Gestão de usuários da plataforma' },
    { name: 'Matérias', slug: 'news', description: 'Portal de notícias e publicações' },
    { name: 'Futebol', slug: 'football', description: 'Elenco, comissão técnica e jogos' },
    { name: 'História', slug: 'history', description: 'Ídolos, conquistas e patrimônio' }
  ];

  for (const m of modules) {
    await moduleModel.findOneAndUpdate({ slug: m.slug }, m, { upsert: true, new: true });
  }
  console.log('✅ Módulos sincronizados.');

  // 2. Seed Roles
  const roles = [
    { name: 'OWNER', label: 'Proprietário', description: 'Proprietário do sistema com acesso total.', isImmutable: true, permissions: ['modules.manage', 'roles.manage', 'users.manage', 'users.view', 'users.create', 'users.edit', 'users.delete'] },
    { name: 'ADMIN', label: 'Administrador', description: 'Administrador geral.', isImmutable: true, permissions: ['users.manage', 'users.view', 'users.create', 'users.edit', 'users.delete'] },
    { name: 'EDITOR', label: 'Editor', description: 'Pode publicar e editar notícias.', isImmutable: true, permissions: ['news.manage', 'users.view'] },
    { name: 'SOCIETY', label: 'Sócio', description: 'Sócio torcedor com acesso a conteúdos exclusivos.', isImmutable: true, permissions: [] },
    { name: 'USER', label: 'Usuário', description: 'Usuário padrão (básico).', isImmutable: true, permissions: [] },
  ];

  for (const r of roles) {
    await roleModel.findOneAndUpdate({ name: r.name }, r, { upsert: true, new: true });
  }
  console.log('✅ Roles sincronizadas.');

  // 3. Seed Owner User
  const ownerRole = await roleModel.findOne({ name: 'OWNER' });
  if (!ownerRole) {
    throw new Error('Erro: Role OWNER não foi criada corretamente.');
  }

  const ownerEmail = 'admin@ecpelotas.com.br';
  const existingOwner = await userModel.findOne({ email: ownerEmail });
  
  if (existingOwner) {
    console.log('⚠️ Usuário Owner já existe. Atualizando Role ID...');
    existingOwner.role = ownerRole._id;
    await existingOwner.save();
  } else {
    const password = 'SuperSecretPassword123!';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    await userModel.create({
      firstName: 'Owner',
      lastName: 'Admin',
      email: ownerEmail,
      cpf: '00000000000',
      birthDate: new Date('1980-01-01'),
      phones: [{ number: '00000000000', isPrimary: true }],
      addresses: [{ zipCode: '00000000', street: 'Owner St', number: '0', neighborhood: 'Center', city: 'Pelotas', state: 'RS', isPrimary: true }],
      passwordHash,
      role: ownerRole._id,
      status: UserStatus.ACTIVE,
      isActive: true,
    });
    console.log(`✅ Owner criado com sucesso!`);
    console.log(`📧 Email: ${ownerEmail}`);
    console.log(`🔑 Senha: ${password}`);
  }

  // 4. Update any existing users that have string roles
  const usersWithStringRoles = await userModel.find({ role: { $type: 'string' } });
  for (const user of usersWithStringRoles) {
    const stringRole = user.get('role') as unknown as string;
    const matchedRole = await roleModel.findOne({ name: stringRole });
    if (matchedRole) {
      user.role = matchedRole._id;
      await user.save();
      console.log(`🔄 Atualizou usuário ${user.email} para roleId ${matchedRole._id}`);
    }
  }
  
  await app.close();
  process.exit(0);
}

bootstrap();
