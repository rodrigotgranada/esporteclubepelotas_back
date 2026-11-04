import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Athlete, AthleteSchema } from './schemas/athlete.schema.js';
import { Squad, SquadSchema } from './schemas/squad.schema.js';
import { AthletesService } from './athletes.service.js';
import { AthletesAdminService } from './athletes-admin.service.js';
import { SquadsService } from './squads.service.js';
import { SquadsAdminService } from './squads-admin.service.js';
import { AthletesController } from './athletes.controller.js';
import { AthletesAdminController } from './athletes-admin.controller.js';
import { SquadsController } from './squads.controller.js';
import { SquadsAdminController } from './squads-admin.controller.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';
import { SystemModulesModule } from '../system-modules/system-modules.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Athlete.name, schema: AthleteSchema },
      { name: Squad.name, schema: SquadSchema },
    ]),
    StorageModule,
    SystemModulesModule,
    AuthModule,
  ],
  controllers: [
    AthletesController,
    AthletesAdminController,
    SquadsController,
    SquadsAdminController,
  ],
  providers: [
    AthletesService,
    AthletesAdminService,
    SquadsService,
    SquadsAdminService,
  ],
  exports: [
    AthletesService,
    AthletesAdminService,
    SquadsService,
    SquadsAdminService,
  ],
})
export class FootballModule {}
