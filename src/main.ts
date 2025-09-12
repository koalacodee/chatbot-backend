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

async function bootstrap() {
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
  await app.register(fastifyCookie, {
    secret: configService.get<string>('COOKIE_SECRET') || 'default-secret',
  });
  app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });
  await app.register(fastifyCompress);
  await app.register(fastifyCors, {
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') ?? '*',
    credentials: true,
    methods: configService.get<string>('CORS_METHODS').split(','),
  });
  await app.register(fastifyMultipart);

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
