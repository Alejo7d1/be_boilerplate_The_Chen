import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@Auth';
import { JwtAuthGuard, RolesGuard } from '@Auth/guards';
import { HealthModule } from '@Health';
import { PrismaModule } from '@Prisma';
import { UsersModule } from '@Users';
import { validateEnv } from '@Config';
import { ClassSessionsModule } from '@ClassSessions';
import { EquipmentModule } from '@Equipment';
import { MembershipsModule } from '@Memberships';
import { NotificationsModule } from '@Notifications';
import { PersonalSessionsModule } from '@PersonalSessions';
import { PlansModule } from '@Plans';
import { ReservationsModule } from '@Reservations';
import { TrainersModule } from '@Trainers';
import { AccessModule } from '@Access';
import { ChargesModule } from '@Charges';
import { PaymentsModule } from '@Payments';
import { ProgressModule } from '@Progress';
import { ReportsModule } from '@Reports';
import { ReviewsModule } from '@Reviews';
import { RoutinesModule } from '@Routines';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Si falta DATABASE_URL o JWT_SECRET, la app no arranca.
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ClassSessionsModule,
    MembershipsModule,
    PlansModule,
    ReservationsModule,
    TrainersModule,
    PersonalSessionsModule,
    NotificationsModule,
    EquipmentModule,
    AccessModule,
    ChargesModule,
    PaymentsModule,
    RoutinesModule,
    ProgressModule,
    ReviewsModule,
    ReportsModule,
  ],
  providers: [
    {
      // Todo cerrado por defecto: las rutas públicas se abren con @Public().
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      // Corre después del guard de JWT y solo actúa si hay @Roles(...).
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
