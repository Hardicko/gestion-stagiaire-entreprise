import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AuditLogPageDto,
  AuditLogResponseDto,
} from './dto/audit-log-response.dto';

@ApiTags("Journal d'audit")
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATEUR')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Consulter le journal d'audit paginé" })
  @ApiOkResponse({ type: AuditLogPageDto })
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Consulter un événement d'audit" })
  @ApiOkResponse({ type: AuditLogResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.auditService.findOne(id);
  }
}
