import { Controller, Get } from '@nestjs/common';
import { DatabaseHealth, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('database')
  checkDatabase(): Promise<DatabaseHealth> {
    return this.healthService.checkDatabase();
  }
}
