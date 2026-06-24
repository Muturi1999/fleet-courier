import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { CamelCaseInterceptor } from "./common/interceptors/camel-case.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prefix = config.get<string>("API_PREFIX", "api/v1");

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN", "*"),
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-tenant-id",
      "x-tenant-slug",
      "x-platform-key",
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new CamelCaseInterceptor());

  const swagger = new DocumentBuilder()
    .setTitle("Fleet Courier API")
    .setDescription("Multi-tenant fleet billing, scheduling & KRA eTIMS")
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-tenant-id", in: "header" }, "tenant-id")
    .addApiKey({ type: "apiKey", name: "x-tenant-slug", in: "header" }, "tenant-slug")
    .addApiKey({ type: "apiKey", name: "x-platform-key", in: "header" }, "platform-key")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  console.log(`Fleet API running on http://localhost:${port}/${prefix}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
