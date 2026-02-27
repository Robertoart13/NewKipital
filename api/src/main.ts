import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const result: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      result.push(...Object.values(error.constraints).map(translateValidationMessage));
    }
    if (error.children?.length) {
      result.push(...flattenValidationErrors(error.children));
    }
  }

  return result;
}

function translateValidationMessage(message: string): string {
  return message
    .replace('must be a string', 'debe ser un texto')
    .replace('must be a boolean value', 'debe ser un valor booleano')
    .replace('must be an integer number', 'debe ser un numero entero')
    .replace('must be a number conforming to the specified constraints', 'debe ser un numero valido')
    .replace('must be an email', 'debe ser un correo electronico valido')
    .replace('must be a valid ISO 8601 date string', 'debe ser una fecha valida')
    .replace('should not be empty', 'no debe estar vacio')
    .replace('must be shorter than or equal to', 'debe tener como maximo')
    .replace('must be longer than or equal to', 'debe tener como minimo')
    .replace('characters', 'caracteres');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const configService = app.get(ConfigService);
  const isDev = configService.get<string>('NODE_ENV') === 'development';

  const allowedOrigins = isDev
    ? ['http://localhost:5173', 'http://localhost:5174']
    : ['https://kpital360.com', 'https://timewise.kpital360.com'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => new BadRequestException({
        success: false,
        data: null,
        message: flattenValidationErrors(errors),
        error: 'Solicitud invalida',
      }),
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
}
bootstrap();
