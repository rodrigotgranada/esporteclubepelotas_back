import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from '../modules/users/schemas/user.schema.js';
import { Role, RoleDocument } from '../modules/roles/schemas/role.schema.js';
import { SystemModule, SystemModuleDocument } from '../modules/system-modules/schemas/system-module.schema.js';
import { Theme, ThemeDocument } from '../modules/themes/schemas/theme.schema.js';
import { Setting, SettingDocument } from '../modules/settings/schemas/setting.schema.js';
import { NewsArticle, NewsArticleDocument, NewsStatus, NewsFeaturedSlot } from '../modules/news/schemas/news-article.schema.js';
import { NewsCategory, NewsCategoryDocument } from '../modules/news/schemas/news-category.schema.js';
import { Idol, IdolDocument } from '../modules/idols/schemas/idol.schema.js';
import { sampleIdols } from './seed-idols.helper.js';
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
  const articleModel = app.get<Model<NewsArticleDocument>>(getModelToken(NewsArticle.name));
  const categoryModel = app.get<Model<NewsCategoryDocument>>(getModelToken(NewsCategory.name));
  const idolModel = app.get<Model<IdolDocument>>(getModelToken(Idol.name));

  console.log('🧹 Limpando coleções existentes para reset limpo...');
  await Promise.all([
    userModel.deleteMany({}),
    roleModel.deleteMany({}),
    moduleModel.deleteMany({}),
    themeModel.deleteMany({}),
    settingModel.deleteMany({}),
    articleModel.deleteMany({}),
    categoryModel.deleteMany({}),
    idolModel.deleteMany({}),
  ]);
  console.log('✨ Coleções limpas com sucesso.');

  // 1. Módulos do Sistema
  console.log('\n📦 [1/5] Sincronizando Módulos do Sistema...');
  const modules = [
    { name: 'Usuários', slug: 'users', description: 'Gestão de usuários e permissões da plataforma' },
    { name: 'Matérias', slug: 'news', description: 'Portal de notícias e publicações' },
    { name: 'Ídolos & Memorial', slug: 'idols', description: 'Galeria de ídolos, atletas lendários, treinadores, funcionários e torcedores ilustres' },
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
        'idols.manage',
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
        'idols.manage',
        'settings.manage',
      ],
    },
    {
      name: 'EDITOR',
      label: 'Editor de Conteúdo',
      description: 'Pode redigir, aprovar e publicar matérias e notícias.',
      isImmutable: true,
      permissions: ['news.manage', 'idols.manage', 'users.view'],
    },
    {
      name: 'SOCIO',
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
  console.log('\n👥 [3/5] Criando Usuários com Senha Padronizada e Avatares...');
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
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    {
      firstName: 'Gestor',
      lastName: 'Administrativo',
      email: 'gestor@ecpelotas.com.br',
      cpf: '00000000002',
      role: createdRoles['ADMIN']._id,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      firstName: 'Editor',
      lastName: 'Notícias',
      email: 'editor@ecpelotas.com.br',
      cpf: '00000000003',
      role: createdRoles['EDITOR']._id,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      firstName: 'Sócio',
      lastName: 'Ouro',
      email: 'socio@ecpelotas.com.br',
      cpf: '00000000004',
      role: createdRoles['SOCIO']._id,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      firstName: 'Torcedor',
      lastName: 'Áureo-Cerúleo',
      email: 'torcedor@ecpelotas.com.br',
      cpf: '00000000005',
      role: createdRoles['USER']._id,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
  ];

  for (const u of initialUsers) {
    await userModel.create({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      cpf: u.cpf,
      avatarUrl: u.avatarUrl,
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
        buttonPrimaryText: '#1e3a8a',
        buttonSecondaryText: '#ffffff',
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
        buttonPrimaryText: '#000000',
        buttonSecondaryText: '#ffffff',
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
  console.log('\n⚙️ [5/6] Inicializando Configurações Gerais do Clube...');
  await settingModel.create({
    clubName: 'Esporte Clube Pelotas',
    clubLogoGallery: [],
    socialMedia: {
      instagram: ['https://instagram.com/ecpelotas'],
      facebook: ['https://facebook.com/ecpelotas'],
      x: ['https://x.com/ecpelotas'],
      youtube: ['https://youtube.com/@ecpelotasoficial'],
    },
    socialLinks: [
      { platform: 'instagram', label: '@ecpelotas (Oficial)', url: 'https://instagram.com/ecpelotas' },
      { platform: 'instagram', label: '@base_ecpelotas (Base)', url: 'https://instagram.com/ecpelotas' },
      { platform: 'facebook', label: 'Esporte Clube Pelotas', url: 'https://facebook.com/ecpelotas' },
      { platform: 'x', label: '@ecpelotas', url: 'https://x.com/ecpelotas' },
      { platform: 'threads', label: '@ecpelotas', url: 'https://threads.net/@ecpelotas' },
      { platform: 'youtube', label: 'TV Lobo Oficial', url: 'https://youtube.com/@ecpelotasoficial' },
      { platform: 'tiktok', label: '@ecpelotas', url: 'https://tiktok.com/@ecpelotas' },
    ],
    contactPhones: [
      { label: 'Secretaria Geral', number: '(53) 3305-1908', isWhatsapp: false },
      { label: 'Central de Sócios', number: '(53) 98408-1908', isWhatsapp: true },
      { label: 'Ouvidoria', number: '(53) 3305-1909', isWhatsapp: false },
    ],
    contactEmails: [
      { label: 'Secretaria', email: 'secretaria@ecpelotas.com.br' },
      { label: 'Quadro Social', email: 'socios@ecpelotas.com.br' },
      { label: 'Assessoria de Imprensa', email: 'imprensa@ecpelotas.com.br' },
      { label: 'Comercial & Patrocínios', email: 'comercial@ecpelotas.com.br' },
    ],
    openingHours: [
      { department: 'Secretaria Geral', schedule: 'Seg a Sex, das 09h às 18h' },
      { department: 'Loja Oficial Lobo Mania', schedule: 'Seg a Sex: 09h às 19h | Sáb: 09h às 13h' },
      { department: 'Central de Sócios', schedule: 'Seg a Sex: 09h às 18h | Sáb: 09h às 12h' },
    ],
    footerNavigationLinks: [
      { label: 'Início', url: '/', isVisible: true, isExternal: false },
      { label: 'Notícias do Lobo', url: '/noticias', isVisible: true, isExternal: false },
      { label: 'Quadro Social (Seja Sócio)', url: '/socio', isVisible: true, isExternal: false },
      { label: 'Ingressos e Jogos', url: '/ingressos', isVisible: true, isExternal: false },
      { label: 'Área do Sócio / Perfil', url: '/profile', isVisible: true, isExternal: false },
      { label: 'Portal Administrativo', url: '/gestao', isVisible: false, isExternal: false },
    ],
    stadiumName: 'Estádio Boca do Lobo',
    stadiumAddress: 'Av. Bento Gonçalves esquina Parque Dom Antônio Zattera - Pelotas/RS, CEP 96015-140',
    googleMapsEmbedUrl: 'https://maps.google.com/maps?q=Est%C3%A1dio+Boca+do+Lobo,+Pelotas+-+RS&t=&z=16&ie=UTF8&iwloc=&output=embed',
    copyrightText: '© 2026 Esporte Clube Pelotas - Fundado em 11 de Outubro de 1908. Todos os direitos reservados.',
  });
  console.log('✅ Configurações do clube criadas com sucesso.');

  // 6. Categorias e Notícias Iniciais
  console.log('\n📰 [6/6] Semeando Categorias e Notícias Iniciais...');
  const categoriesData = [
    { name: 'Futebol Profissional', slug: 'futebol-profissional', description: 'Notícias do time principal e jogos', order: 1 },
    { name: 'Categorias de Base', slug: 'categorias-de-base', description: 'Atividades e partidas do Sub-15, Sub-17 e Sub-20', order: 2 },
    { name: 'Sócios & Torcida', slug: 'socios-e-torcida', description: 'Informações sobre planos, promoções e torcida', order: 3 },
    { name: 'Institucional', slug: 'institucional', description: 'Comunicação oficial e diretoria', order: 4 },
    { name: 'Nota Oficial', slug: 'nota-oficial', description: 'Comunicados e notas oficiais do clube', order: 5 },
  ];

  const createdCategories: Record<string, any> = {};
  for (const c of categoriesData) {
    const created = await categoryModel.create(c);
    createdCategories[c.slug] = created;
  }
  console.log(`✅ ${categoriesData.length} categorias de notícias criadas.`);

  const authorUser = (await userModel.findOne({ email: 'editor@ecpelotas.com.br' })) || (await userModel.findOne({ email: 'admin@ecpelotas.com.br' }));
  const authorId = authorUser?._id;

  const sampleArticles = [
    {
      title: 'Pelotas vence o clássico na Boca do Lobo e assume a liderança do grupo',
      subtitle: 'Com grande apoio da torcida áureo-cerúlea, o Lobo bateu o rival por 2 a 0 com gols de pênalti e cabeça.',
      slug: 'pelotas-vence-o-classico-na-boca-do-lobo-e-assume-a-lideranca-do-grupo',
      coverImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop',
      coverCaption: 'Foto: Assessoria / E.C. Pelotas',
      summary: 'Em uma tarde memorável no Estádio Boca do Lobo, o Pelotas conquistou uma vitória categórica no clássico regional e assumiu o topo da tabela.',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Em uma tarde de estádio lotado na Avenida Bento Gonçalves, o Esporte Clube Pelotas realizou uma atuação impecável diante de sua torcida e conquistou uma grande vitória por 2 a 0 no clássico regional.' }]
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Domínio do início ao fim' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Pressionando desde os minutos iniciais, a equipe áureo-cerúlea abriu o placar aos 28 minutos da primeira etapa após cobrança de pênalti precisa. No segundo tempo, em bela jogada de linha de fundo, veio o gol de cabeça que selou o resultado.' }]
          },
          {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '"Esta vitória reflete a entrega de todo o grupo e a energia indescritível que vem das arquibancadas da Boca do Lobo.", destacou o treinador áureo-cerúleo em coletiva.' }] }]
          }
        ]
      },
      category: createdCategories['futebol-profissional']._id,
      tags: ['#Gauchão', '#Lobo', '#BocaDoLobo', '#Clássico'],
      status: NewsStatus.PUBLISHED,
      isFeatured: true,
      featuredSlot: NewsFeaturedSlot.MAIN,
      author: authorId,
      publishedAt: new Date(),
      viewsCount: 142,
      isActive: true,
      gallery: [
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop'
      ]
    },
    {
      title: 'Seja Sócio Áureo-Cerúleo: Campanha 2026 traz benefícios e descontos',
      subtitle: 'Torcedor pode se associar online e garantir entrada livre em todos os jogos em casa.',
      slug: 'seja-socio-aureo-ceruleo-campanha-2026-traz-beneficios-e-descontos',
      coverImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop',
      coverCaption: 'Foto: Departamento de Sócios / E.C. Pelotas',
      summary: 'A nova campanha de associação valoriza a tradição do clube e oferece facilidades no pagamento e aplicativo exclusivo.',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'O Esporte Clube Pelotas lança oficialmente a sua nova campanha de sócios para a temporada 2026. Com planos acessíveis a todas as famílias áureo-cerúleas, o torcedor terá acesso facilitado e catracas exclusivas na Boca do Lobo.' }]
          }
        ]
      },
      category: createdCategories['socios-e-torcida']._id,
      tags: ['#SócioLobo', '#Pelotas', '#AvanteLobo'],
      status: NewsStatus.PUBLISHED,
      isFeatured: false,
      author: authorId,
      publishedAt: new Date(Date.now() - 86400000),
      viewsCount: 89,
      isActive: true
    },
    {
      title: 'Categorias de Base: Sub-17 do Pelotas inicia preparação com foco na Copa FGF',
      subtitle: 'Com nova comissão técnica, jovens atletas treinam forte no CT da Boca do Lobo.',
      slug: 'categorias-de-base-sub-17-do-pelotas-inicia-preparacao-com-foco-na-copa-fgf',
      coverImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
      coverCaption: 'Foto: Divulgação / Base Áureo-Cerúlea',
      summary: 'Plantel juvenil conta com jovens talentos de Pelotas e região sul do estado.',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'A equipe Sub-17 do Pelotas deu a largada nas atividades da pré-temporada nesta semana. A preparação visa a disputa dos torneios estaduais e a formação contínua de atletas para o elenco profissional.' }]
          }
        ]
      },
      category: createdCategories['categorias-de-base']._id,
      tags: ['#BaseForte', '#Sub17', '#FuturoDoLobo'],
      status: NewsStatus.PUBLISHED,
      isFeatured: false,
      author: authorId,
      publishedAt: new Date(Date.now() - 172800000),
      viewsCount: 65,
      isActive: true
    }
  ];

  for (const art of sampleArticles) {
    await articleModel.create(art);
  }
  console.log(`✅ ${sampleArticles.length} matérias completas de notícias cadastradas.`);

  // 6. Ídolos do Memorial
  console.log('\n⭐ [6/6] Cadastrando Ídolos Históricos do Memorial...');
  for (const idol of sampleIdols) {
    await idolModel.create({ ...idol, createdBy: authorId, lastEditedBy: authorId });
  }
  console.log(`✅ ${sampleIdols.length} ídolos lendários cadastrados.`);

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' 🎉 SEED CONCLUÍDO COM SUCESSO!');
  console.log(' Credenciais de Acesso Disponíveis para Login (por CPF):');
  console.log(' 👑 Owner:    CPF: 000.000.000-01 (admin@ecpelotas.com.br)    | Senha: SuperSecretPassword123!');
  console.log(' 🛡️ Admin:    CPF: 000.000.000-02 (gestor@ecpelotas.com.br)   | Senha: SuperSecretPassword123!');
  console.log(' ✍️ Editor:   CPF: 000.000.000-03 (editor@ecpelotas.com.br)   | Senha: SuperSecretPassword123!');
  console.log(' 🎫 Sócio:    CPF: 000.000.000-04 (socio@ecpelotas.com.br)    | Senha: SuperSecretPassword123!');
  console.log(' ⚽ Torcedor: CPF: 000.000.000-05 (torcedor@ecpelotas.com.br) | Senha: SuperSecretPassword123!');
  console.log('═════════════════════════════════════════════════════════════════\n');

  await app.close();
  process.exit(0);
}

void bootstrap();
