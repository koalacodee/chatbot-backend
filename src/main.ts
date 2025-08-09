import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import * as morgan from 'morgan';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { JsendInterceptor } from './common/interceptors/jsend.interceptor';
import { JSendExceptionFilter } from './common/filters/jsend-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Body parsing with custom options
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true }));
  app.use(cookieParser()); // Add cookie parser middleware

  // Apply middlewares
  app.use(helmet());
  app.use(compression());
  app.use(morgan(configService.get('MORGAN_FORMAT')));

  // Configure CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS').split(','),
    credentials: true,
    methods: configService.get<string>('CORS_METHODS').split(','),
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('The Blog API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('blog')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new JsendInterceptor());
  app.useGlobalFilters(new JSendExceptionFilter());

  app.setGlobalPrefix(configService.get('API_PREFIX'));
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
