import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { ResultsService } from './results.service';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.resultsService.findAll(
      user.userId,
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.resultsService.findOne(user.userId, id);
  }
}
