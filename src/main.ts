import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  console.log('frontend origins', process.env.FRONTEND_ORIGINS);
  const allowedOrigins = (
    process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => {
      console.log('origin', origin);
      return origin.trim();
    });
  console.log('allowedOrigins', allowedOrigins);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port, '0.0.0.0');
}
void bootstrap();
