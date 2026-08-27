import 'reflect-metadata';

import { ConflictException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../prisma/prisma.service';
import { EmployeeService } from './employee.service';

describe('EmployeeService', () => {
  const employeeRepository = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const departmentRepository = {
    findFirst: jest.fn(),
  };
  const positionRepository = {
    findFirst: jest.fn(),
  };
  const authSessionRepository = {
    updateMany: jest.fn(),
  };
  const transaction = jest.fn((operations: Array<Promise<unknown>>) =>
    Promise.all(operations),
  );
  const prisma = {
    employee: employeeRepository,
    department: departmentRepository,
    position: positionRepository,
    authSession: authSessionRepository,
    $transaction: transaction,
  } as unknown as PrismaService;

  let service: EmployeeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeeService(prisma);
  });

  it('crée un employé avec un poste actif sélectionné', async () => {
    departmentRepository.findFirst.mockResolvedValue({
      id: 'department-id',
    });
    positionRepository.findFirst.mockResolvedValue({
      id: 'position-id',
    });
    employeeRepository.findFirst.mockResolvedValue(null);
    employeeRepository.create.mockResolvedValue({
      id: 'employee-id',
    });

    await expect(
      service.create({
        employeeNumber: ' emp-001 ',
        firstName: ' Awa ',
        lastName: ' Traoré ',
        email: ' AWA@EXAMPLE.COM ',
        phone: ' 76000000 ',
        positionId: 'position-id',
        departmentId: 'department-id',
      }),
    ).resolves.toEqual({
      id: 'employee-id',
    });

    expect(positionRepository.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'position-id',
        isActive: true,
      },
    });
    expect(employeeRepository.create).toHaveBeenCalledWith({
      data: {
        employeeNumber: 'EMP-001',
        firstName: 'Awa',
        lastName: 'Traoré',
        email: 'awa@example.com',
        phone: '76000000',
        positionId: 'position-id',
        departmentId: 'department-id',
        isActive: true,
      },
      include: {
        department: true,
        position: true,
      },
    });
  });

  it('désactive l’employé et révoque immédiatement ses sessions', async () => {
    employeeRepository.findUnique.mockResolvedValue({
      id: 'employee-id',
      isActive: true,
      department: { id: 'department-id' },
    });
    employeeRepository.update.mockResolvedValue({
      id: 'employee-id',
      isActive: false,
    });
    authSessionRepository.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.remove('employee-id')).resolves.toEqual({
      id: 'employee-id',
      isActive: false,
    });

    expect(employeeRepository.update).toHaveBeenCalledWith({
      where: { id: 'employee-id' },
      data: { isActive: false },
      include: { department: true, position: true },
    });
    expect(authSessionRepository.updateMany).toHaveBeenCalledWith({
      where: {
        user: {
          employeeId: 'employee-id',
        },
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('refuse de désactiver deux fois le même employé', async () => {
    employeeRepository.findUnique.mockResolvedValue({
      id: 'employee-id',
      isActive: false,
      department: { id: 'department-id' },
    });

    await expect(service.remove('employee-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});
