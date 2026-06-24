import { BullModule } from "@nestjs/bullmq";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { BillingProfileModule } from "./billing-profile/billing-profile.module";
import { ClientsModule } from "./clients/clients.module";
import { ConsolidatedInvoicesModule } from "./consolidated-invoices/consolidated-invoices.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { DriversModule } from "./drivers/drivers.module";
import { EtimsModule } from "./etims/etims.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { HealthModule } from "./health/health.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RateCardsModule } from "./rate-cards/rate-cards.module";
import { ReportsModule } from "./reports/reports.module";
import { RoutesModule } from "./routes/routes.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { PartnersModule } from "./partners/partners.module";
import { PlatformModule } from "./platform/platform.module";
import { TenantsModule } from "./tenants/tenants.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { WorkTicketsModule } from "./work-tickets/work-tickets.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import { TenantContextModule } from "./common/tenant-context/tenant-context.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("REDIS_HOST", "localhost"),
          port: config.get<number>("REDIS_PORT", 6379),
        },
      }),
    }),
    PrismaModule,
    TenantContextModule,
    TenantsModule,
    PlatformModule,
    PartnersModule,
    WorkflowsModule,
    HealthModule,
    AuthModule,
    SchedulesModule,
    VehiclesModule,
    DriversModule,
    RoutesModule,
    ExpensesModule,
    BillingProfileModule,
    InvoicesModule,
    RateCardsModule,
    DeliveriesModule,
    WorkTicketsModule,
    ConsolidatedInvoicesModule,
    NotificationsModule,
    ClientsModule,
    ReportsModule,
    EtimsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        "api/v1/auth/login",
        "api/v1/platform/auth/login",
        "api/v1/platform/(.*)",
        "api/v1/tenants",
        "api/v1/tenants/(.*)",
        "api/v1/health",
        "docs",
        "docs/(.*)",
      )
      .forRoutes("*");
  }
}
