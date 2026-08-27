import 'reflect-metadata';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ProjectStatus } from '../../generated/prisma/enums';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  const validPayload = {
    name: 'Portail de gestion des stages',
    description: 'Application interne',
    gitlabLink: 'https://gitlab.example.com/entreprise/gestion-stages',
    startDate: '2026-09-01',
    endDate: '2027-01-31',
    status: ProjectStatus.PLANNED,
    departmentId: '11111111-1111-4111-8111-111111111111',
  };

  it('accepte un projet valide avec un lien GitLab', async () => {
    const dto = plainToInstance(CreateProjectDto, validPayload);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepte un lien GitLab et une description nuls', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      gitlabLink: null,
      description: null,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse un code projet fourni par le client', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        {
          ...validPayload,
          projectCode: 'PRJ-MANUEL',
        },
        {
          type: 'body',
          metatype: CreateProjectDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un lien GitLab sans URL valide', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      gitlabLink: 'gitlab-invalide',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'gitlabLink')).toBe(true);
  });

  it('refuse un statut et un département invalides', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      status: 'UNKNOWN',
      departmentId: 'department-1',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['status', 'departmentId']),
    );
  });
});
