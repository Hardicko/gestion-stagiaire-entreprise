import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';
export const SWAGGER_JSON_PATH = 'api/docs-json';
export const SWAGGER_BEARER_NAME = 'access-token';

export function setupSwagger(app: INestApplication): void {
  const configuration = new DocumentBuilder()
    .setTitle('API Gestion des stagiaires')
    .setDescription(
      "Contrat OpenAPI du backend de gestion des stagiaires de l'entreprise.",
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Saisissez uniquement le JWT obtenu avec POST /auth/login.',
      },
      SWAGGER_BEARER_NAME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, configuration, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  });
}
