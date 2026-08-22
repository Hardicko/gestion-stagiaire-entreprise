import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import {
  setupSwagger,
  SWAGGER_BEARER_NAME,
  SWAGGER_JSON_PATH,
} from './../src/config/swagger.config';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      'test-only-jwt-secret-that-is-long-enough-for-e2e-tests';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it(`/${SWAGGER_JSON_PATH} (GET) expose le contrat OpenAPI et JWT`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${SWAGGER_JSON_PATH}`)
      .expect(200);

    expect(response.body.info).toEqual(
      expect.objectContaining({
        title: 'API Gestion des stagiaires',
        version: '1.0.0',
      }),
    );
    expect(response.body.paths).toEqual(
      expect.objectContaining({
        '/auth/login': expect.any(Object),
        '/users': expect.any(Object),
        '/permissions': expect.any(Object),
        '/roles/{id}/permissions': expect.any(Object),
        '/projects': expect.any(Object),
        '/project-assignments': expect.any(Object),
        '/dashboard': expect.any(Object),
        '/audit-logs': expect.any(Object),
      }),
    );
    expect(
      response.body.components.securitySchemes[SWAGGER_BEARER_NAME],
    ).toEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }),
    );
    expect(response.body.paths['/users'].get.security).toEqual([
      { [SWAGGER_BEARER_NAME]: [] },
    ]);
    expect(response.body.paths['/audit-logs'].get.security).toEqual([
      { [SWAGGER_BEARER_NAME]: [] },
    ]);
    expect(response.body.paths['/auth/login'].post.security).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });
});
