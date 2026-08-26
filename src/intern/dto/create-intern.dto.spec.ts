import 'reflect-metadata';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { EducationLevel, Gender } from '../../generated/prisma/enums';
import { CreateInternDto } from './create-intern.dto';

describe('CreateInternDto', () => {
  const validPayload = {
    firstName: 'Awa',
    lastName: 'Traoré',
    dateOfBirth: '2001-05-10',
    gender: Gender.FEMALE,
    email: 'awa.traore@example.com',
    phone: '70000000',
    school: 'Université de Bamako',
    fieldOfStudy: 'Informatique',
    educationLevel: EducationLevel.LICENCE,
    studyYear: 3,
  };

  it('accepte un dossier de stagiaire valide', async () => {
    const dto = plainToInstance(CreateInternDto, validPayload);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse un code d’inscription fourni par le client', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        {
          ...validPayload,
          registrationCode: 'STG-MANUEL',
        },
        {
          type: 'body',
          metatype: CreateInternDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse les valeurs inconnues pour le genre et le niveau', async () => {
    const dto = plainToInstance(CreateInternDto, {
      ...validPayload,
      gender: 'UNKNOWN',
      educationLevel: 'DOCTORAT',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['gender', 'educationLevel']),
    );
  });

  it('refuse une année d’étude hors de la plage autorisée', async () => {
    const dto = plainToInstance(CreateInternDto, {
      ...validPayload,
      studyYear: 11,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'studyYear')).toBe(true);
  });
});
