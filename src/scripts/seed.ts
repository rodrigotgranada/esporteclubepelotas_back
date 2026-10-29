import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from '../modules/users/schemas/user.schema.js';
import { Role, RoleDocument } from '../modules/roles/schemas/role.schema.js';
import { SystemModule, SystemModuleDocument } from '../modules/system-modules/schemas/system-module.schema.js';
import { Theme, ThemeDocument } from '../modules/themes/schemas/theme.schema.js';
import { Setting, SettingDocument } from '../modules/settings/schemas/setting.schema.js';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(' 🌱 Iniciando Seed Completo do Banco de Dados (E.C. Pelotas)');
  console.log('═════════════════════════════════════════════════════════════════');

  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
  const moduleModel = app.get<Model<SystemModuleDocument>>(getModelToken(SystemModule.name));
  const themeModel = app.get<Model<ThemeDocument>>(getModelToken(Theme.name));
  const settingModel = app.get<Model<SettingDocument>>(getModelToken(Setting.name));

  console.log('🧹 Limpando coleções existentes para reset limpo...');
  await Promise.all([
    userModel.deleteMany({}),
    roleModel.deleteMany({}),
    moduleModel.deleteMany({}),
    themeModel.deleteMany({}),
    settingModel.deleteMany({}),
  ]);
  console.log('✨ Coleções limpas com sucesso.');

  // 1. Módulos do Sistema
  console.log('\n📦 [1/5] Sincronizando Módulos do Sistema...');
  const modules = [
    { name: 'Usuários', slug: 'users', description: 'Gestão de usuários e permissões da plataforma' },
    { name: 'Matérias', slug: 'news', description: 'Portal de notícias e publicações' },
    { name: 'Futebol', slug: 'football', description: 'Elenco, comissão técnica e partidas' },
    { name: 'História', slug: 'history', description: 'Ídolos, conquistas e patrimônio' },
    { name: 'Configurações', slug: 'settings', description: 'Personalização do clube e temas' },
  ];

  for (const m of modules) {
    await moduleModel.create(m);
  }
  console.log(`✅ ${modules.length} módulos cadastrados.`);

  // 2. Roles e Permissões
  console.log('\n🛡️ [2/5] Cadastrando Níveis de Acesso (Roles)...');
  const rolesData = [
    {
      name: 'OWNER',
      label: 'Proprietário',
      description: 'Proprietário do sistema com controle total e irrestrito.',
      isImmutable: true,
      permissions: [
        'modules.manage',
        'roles.manage',
        'users.manage',
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'news.manage',
        'settings.manage',
      ],
    },
    {
      name: 'ADMIN',
      label: 'Administrador',
      description: 'Administrador da plataforma com gestão de conteúdo e usuários.',
      isImmutable: true,
      permissions: [
        'users.manage',
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'news.manage',
        'settings.manage',
      ],
    },
    {
      name: 'EDITOR',
      label: 'Editor de Conteúdo',
      description: 'Pode redigir, aprovar e publicar matérias e notícias.',
      isImmutable: true,
      permissions: ['news.manage', 'users.view'],
    },
    {
      name: 'SOCIETY',
      label: 'Sócio Torcedor',
      description: 'Sócio torcedor em dia com acesso a benefícios exclusivos.',
      isImmutable: true,
      permissions: [],
    },
    {
      name: 'USER',
      label: 'Torcedor / Usuário',
      description: 'Usuário cadastrado com acesso básico à comunidade.',
      isImmutable: true,
      permissions: [],
    },
  ];

  const createdRoles: Record<string, any> = {};
  for (const r of rolesData) {
    const roleDoc = await roleModel.create(r);
    createdRoles[r.name] = roleDoc;
  }
  console.log(`✅ ${rolesData.length} roles criadas.`);

  // 3. Usuários Iniciais (Ambiente de Testes / Base)
  console.log('\n👥 [3/5] Criando Usuários com Senha Padronizada...');
  const defaultPassword = 'SuperSecretPassword123!';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const initialUsers = [
    {
      firstName: 'Proprietário',
      lastName: 'Master',
      email: 'admin@ecpelotas.com.br',
      cpf: '00000000001',
      role: createdRoles['OWNER']._id,
    },
    {
      firstName: 'Gestor',
      lastName: 'Administrativo',
      email: 'gestor@ecpelotas.com.br',
      cpf: '00000000002',
      role: createdRoles['ADMIN']._id,
    },
    {
      firstName: 'Editor',
      lastName: 'Notícias',
      email: 'editor@ecpelotas.com.br',
      cpf: '00000000003',
      role: createdRoles['EDITOR']._id,
    },
    {
      firstName: 'Sócio',
      lastName: 'Ouro',
      email: 'socio@ecpelotas.com.br',
      cpf: '00000000004',
      role: createdRoles['SOCIETY']._id,
    },
    {
      firstName: 'Torcedor',
      lastName: 'Áureo-Cerúleo',
      email: 'torcedor@ecpelotas.com.br',
      cpf: '00000000005',
      role: createdRoles['USER']._id,
    },
  ];

  for (const u of initialUsers) {
    await userModel.create({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      cpf: u.cpf,
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      emailVerified: true,
      passwordHash,
      role: u.role,
      status: UserStatus.ACTIVE,
      isActive: true,
      phones: [
        {
          number: '53999990000',
          isWhatsapp: true,
          isPrimary: true,
          isVerified: true,
        },
      ],
      addresses: [
        {
          zipCode: '96010000',
          street: 'Av. Bento Gonçalves',
          number: '1234',
          complement: 'Estádio Boca do Lobo',
          neighborhood: 'Centro',
          city: 'Pelotas',
          state: 'RS',
          isPrimary: true,
        },
      ],
      preferences: {
        receiveNewsletter: true,
        receiveSms: false,
      },
    });
  }
  console.log(`✅ ${initialUsers.length} usuários criados com senha: "${defaultPassword}"`);

  // 4. Temas (Padrão, Outubro Rosa, Novembro Azul, Setembro Amarelo)
  console.log('\n🎨 [4/5] Populando Temas Visuais...');
  const themesList = [
    {
      name: 'Padrão (Azul e Amarelo)',
      isActive: true,
      isDefault: true,
      isCampaign: false,
      light: {
        primary: '#fbbf24', // Amarelo Ouro
        secondary: '#1e3a8a', // Azul Royal
        buttonSecondary: '#1e3a8a',
        background: '#f3f4f6',
        surface: '#ffffff',
        header: '#1e3a8a',
        card: '#ffffff',
        drawer: '#ffffff',
        table: '#ffffff',
        textPrimary: '#111827',
        textSecondary: '#4b5563',
        border: '#e5e7eb',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
      dark: {
        primary: '#fbbf24', // Amarelo Ouro
        secondary: '#1e3a8a', // Azul Royal
        buttonSecondary: '#1e3a8a',
        background: '#0a0a0a',
        surface: '#171717',
        header: '#111111',
        card: '#111111',
        drawer: '#111111',
        table: '#111111',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#374151',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
    },
    {
      name: 'Outubro Rosa',
      isActive: false,
      isDefault: false,
      isCampaign: true,
      campaignColor: '#ec4899',
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T23:59:59.999Z'),
      light: {
        primary: '#ec4899', // Pink 500
        secondary: '#be185d', // Pink 700
        buttonSecondary: '#be185d',
        background: '#fdf2f8', // Pink 50
        surface: '#ffffff',
        header: '#ec4899',
        card: '#ffffff',
        drawer: '#ffffff',
        table: '#ffffff',
        textPrimary: '#831843',
        textSecondary: '#9d174d',
        border: '#fbcfe8',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
      dark: {
        primary: '#f472b6', // Pink 400
        secondary: '#ec4899', // Pink 500
        buttonSecondary: '#ec4899',
        background: '#1a0b12',
        surface: '#3b1c2b',
        header: '#28111e',
        card: '#28111e',
        drawer: '#28111e',
        table: '#28111e',
        textPrimary: '#fce7f3',
        textSecondary: '#fbcfe8',
        border: '#831843',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
    },
    {
      name: 'Novembro Azul',
      isActive: false,
      isDefault: false,
      isCampaign: true,
      campaignColor: '#3b82f6',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.999Z'),
      light: {
        primary: '#3b82f6', // Blue 500
        secondary: '#1d4ed8', // Blue 700
        buttonSecondary: '#1d4ed8',
        background: '#eff6ff', // Blue 50
        surface: '#ffffff',
        header: '#3b82f6',
        card: '#ffffff',
        drawer: '#ffffff',
        table: '#ffffff',
        textPrimary: '#1e3a8a',
        textSecondary: '#1e40af',
        border: '#bfdbfe',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
      dark: {
        primary: '#60a5fa', // Blue 400
        secondary: '#3b82f6', // Blue 500
        buttonSecondary: '#3b82f6',
        background: '#0a101d',
        surface: '#152238',
        header: '#0f172a',
        card: '#0f172a',
        drawer: '#0f172a',
        table: '#0f172a',
        textPrimary: '#dbeafe',
        textSecondary: '#bfdbfe',
        border: '#1e3a8a',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
    },
    {
      name: 'Setembro Amarelo',
      isActive: false,
      isDefault: false,
      isCampaign: true,
      campaignColor: '#eab308',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.999Z'),
      light: {
        primary: '#eab308', // Yellow 500
        secondary: '#a16207', // Yellow 700
        buttonSecondary: '#a16207',
        background: '#fefce8', // Yellow 50
        surface: '#ffffff',
        header: '#eab308',
        card: '#ffffff',
        drawer: '#ffffff',
        table: '#ffffff',
        textPrimary: '#713f12',
        textSecondary: '#854d0e',
        border: '#fef08a',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
      dark: {
        primary: '#fde047', // Yellow 300
        secondary: '#eab308', // Yellow 500
        buttonSecondary: '#eab308',
        background: '#1c1911',
        surface: '#2a2416',
        header: '#201b10',
        card: '#201b10',
        drawer: '#201b10',
        table: '#201b10',
        textPrimary: '#fef9c3',
        textSecondary: '#fef08a',
        border: '#713f12',
        success: '#22c55e',
        error: '#ea580c',
        warning: '#f59e0b',
      },
    },
  ];

  for (const t of themesList) {
    await themeModel.create(t);
  }
  console.log(`✅ ${themesList.length} temas cadastrados (Padrão E.C. Pelotas ativo).`);

  // 5. Configurações Globais do Clube
  console.log('\n⚙️ [5/5] Inicializando Configurações Gerais do Clube...');
  await settingModel.create({
    clubName: 'Esporte Clube Pelotas',
    clubLogoGallery: [],
    socialMedia: {
      instagram: ['https://instagram.com/ecpelotas'],
      facebook: ['https://facebook.com/ecpelotas'],
      x: ['https://x.com/ecpelotas'],
      youtube: ['https://youtube.com/@ecpelotasoficial'],
    },
  });
  console.log('✅ Configurações do clube criadas com sucesso.');

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' 🎉 SEED CONCLUÍDO COM SUCESSO!');
  console.log(' Credenciais de Acesso Disponíveis:');
  console.log(' 👑 Owner:    admin@ecpelotas.com.br    / SuperSecretPassword123!');
  console.log(' 🛡️ Admin:    gestor@ecpelotas.com.br   / SuperSecretPassword123!');
  console.log(' ✍️ Editor:   editor@ecpelotas.com.br   / SuperSecretPassword123!');
  console.log(' 🎫 Sócio:    socio@ecpelotas.com.br    / SuperSecretPassword123!');
  console.log(' ⚽ Torcedor: torcedor@ecpelotas.com.br / SuperSecretPassword123!');
  console.log('═════════════════════════════════════════════════════════════════\n');

  await app.close();
  process.exit(0);
}

void bootstrap();
