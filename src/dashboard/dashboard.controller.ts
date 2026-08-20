import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Tableau de bord')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir les statistiques du tableau de bord' })
  @ApiOkResponse({ type: DashboardResponseDto })
  getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
