import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DatabaseHealth {
  status: 'ok';
  database: 'mysql';
  roleCount: number;
  checkedAt: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkDatabase(): Promise<DatabaseHealth> {
    const roleCount = await this.prisma.role.count();

    return {
      status: 'ok',
      database: 'mysql',
      roleCount,
      checkedAt: new Date().toISOString(),
    };
  }
}
