import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Idol, IdolSchema } from './schemas/idol.schema.js';
import { IdolsController } from './idols.controller.js';
import { IdolsAdminController } from './idols-admin.controller.js';
import { IdolsService } from './idols.service.js';
import { IdolsAdminService } from './idols-admin.service.js';
import { SystemModulesModule } from '../system-modules/system-modules.module.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Idol.name, schema: IdolSchema }]),
    SystemModulesModule,
    StorageModule,
    AuthModule,
  ],
  controllers: [IdolsController, IdolsAdminController],
  providers: [IdolsService, IdolsAdminService],
  exports: [IdolsService, IdolsAdminService],
})
export class IdolsModule {}
