import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemModulesService } from './system-modules.service.js';
import { SystemModulesController } from './system-modules.controller.js';
import { SystemModule as SysMod, SystemModuleSchema } from './schemas/system-module.schema.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SysMod.name, schema: SystemModuleSchema }]),
    AuthModule
  ],
  controllers: [SystemModulesController],
  providers: [SystemModulesService],
  exports: [SystemModulesService, MongooseModule],
})
export class SystemModulesModule {}
