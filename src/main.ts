import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { JsendInterceptor } from './common/interceptors/jsend.interceptor';
import { JSendExceptionFilter } from './common/filters/jsend-exception.filter';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { migrate } from './common/drizzle';

async function bootstrap() {
  await migrate();
  const adapter = new FastifyAdapter({
    logger:
      process.env.NODE_ENV !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
                singleLine: true, // كل log في سطر واحد
                ignore: 'pid,hostname,reqId', // يشيل الحقول الزيادة
                messageFormat: true,
              },
            },
          }
        : {
            level: 'info',
          },
  });

  // ✨ Explicit generic على AppModule و NestFastifyApplication
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  const configService = app.get(ConfigService);

  // Register plugins (replacing Express middlewares)
  await app.register(fastifyCookie as any, {
    secret: configService.get<string>('COOKIE_SECRET') || 'default-secret',
  });
  app.register(fastifyHelmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(fastifyCompress as any);
  await app.register(fastifyCors as any, {
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') ?? '*',
    credentials: true,
    methods: configService.get<string>('CORS_METHODS').split(','),
  });
  await app.register(fastifyMultipart as any, {
    global: true,
    // Optimize for streaming - don't buffer files in memory
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB per file
      files: 10, // Maximum 10 files per request
      fieldSize: 1024 * 1024, // 1MB for text fields
      fieldNameSize: 100, // 100 characters for field names
      fieldValueSize: 1024 * 1024, // 1MB for field values
    },
    // Don't preserve file paths for security
    preservePath: false,
    // Use streaming mode
    attachFieldsToBody: false,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('The Blog API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('blog')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Global stuff
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new JsendInterceptor());
  app.useGlobalFilters(new JSendExceptionFilter());

  app.setGlobalPrefix(configService.get('API_PREFIX'));
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0'); // important for Fastify
}
bootstrap();
