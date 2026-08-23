import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyDepartment(departmentId: string): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
      },
    });

    if (!department) {
      throw new NotFoundException(
        'Le département indiqué est introuvable ou inactif.',
      );
    }
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    const employeeNumber = createEmployeeDto.employeeNumber
      .trim()
      .toUpperCase();

    const firstName = createEmployeeDto.firstName.trim();
    const lastName = createEmployeeDto.lastName.trim();

    const email = createEmployeeDto.email.trim().toLowerCase();

    const phone = createEmployeeDto.phone?.trim() || null;
    const jobTitle = createEmployeeDto.jobTitle.trim();

    await this.verifyDepartment(createEmployeeDto.departmentId);

    const existingEmployee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ employeeNumber }, { email }],
      },
    });

    if (existingEmployee) {
      throw new ConflictException(
        'Un employé avec ce matricule ou cet email existe déjà.',
      );
    }

    return this.prisma.employee.create({
      data: {
        employeeNumber,
        firstName,
        lastName,
        email,
        phone,
        jobTitle,
        departmentId: createEmployeeDto.departmentId,
        isActive: createEmployeeDto.isActive ?? true,
      },
      include: {
        department: true,
      },
    });
  }

  async findAll() {
    return this.prisma.employee.findMany({
      where: {
        isActive: true,
      },
      include: {
        department: true,
      },
      orderBy: [
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
      ],
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: {
        id,
      },
      include: {
        department: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé introuvable.');
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.findOne(id);

    if (updateEmployeeDto.departmentId !== undefined) {
      await this.verifyDepartment(updateEmployeeDto.departmentId);
    }

    const employeeNumber = updateEmployeeDto.employeeNumber
      ?.trim()
      .toUpperCase();

    const firstName = updateEmployeeDto.firstName?.trim();

    const lastName = updateEmployeeDto.lastName?.trim();

    const email = updateEmployeeDto.email?.trim().toLowerCase();

    const phone =
      updateEmployeeDto.phone !== undefined
        ? updateEmployeeDto.phone.trim() || null
        : undefined;

    const jobTitle = updateEmployeeDto.jobTitle?.trim();

    if (employeeNumber !== undefined || email !== undefined) {
      const existingEmployee = await this.prisma.employee.findFirst({
        where: {
          id: {
            not: id,
          },
          OR: [
            ...(employeeNumber !== undefined ? [{ employeeNumber }] : []),
            ...(email !== undefined ? [{ email }] : []),
          ],
        },
      });

      if (existingEmployee) {
        throw new ConflictException(
          'Un employé avec ce matricule ou cet email existe déjà.',
        );
      }
    }

    return this.prisma.employee.update({
      where: {
        id,
      },
      data: {
        ...(employeeNumber !== undefined && {
          employeeNumber,
        }),

        ...(firstName !== undefined && {
          firstName,
        }),

        ...(lastName !== undefined && {
          lastName,
        }),

        ...(email !== undefined && {
          email,
        }),

        ...(phone !== undefined && {
          phone,
        }),

        ...(jobTitle !== undefined && {
          jobTitle,
        }),

        ...(updateEmployeeDto.departmentId !== undefined && {
          departmentId: updateEmployeeDto.departmentId,
        }),

        ...(updateEmployeeDto.isActive !== undefined && {
          isActive: updateEmployeeDto.isActive,
        }),
      },
      include: {
        department: true,
      },
    });
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    if (!employee.isActive) {
      throw new ConflictException('Cet employé est déjà désactivé.');
    }

    const revokedAt = new Date();
    const [updatedEmployee] = await this.prisma.$transaction([
      this.prisma.employee.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
        include: {
          department: true,
        },
      }),
      this.prisma.authSession.updateMany({
        where: {
          user: {
            employeeId: id,
          },
          revokedAt: null,
        },
        data: {
          revokedAt,
        },
      }),
    ]);

    return updatedEmployee;
  }
}
