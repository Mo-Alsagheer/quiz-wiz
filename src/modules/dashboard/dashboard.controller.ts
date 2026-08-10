import { Get, Controller, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/common/enums/user-role.enum';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary:
      'Get learner dashboard metrics, upcoming quizzes, and recent results',
  })
  @ApiResponse({ status: 200, description: 'Learner dashboard metrics' })
  @Roles(UserRole.LEARNER)
  @Get('learner')
  learnerDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.learnerDashboard(user.userId);
  }

  @ApiOperation({
    summary:
      'Get instructor dashboard metrics, upcoming quizzes, and top students',
  })
  @ApiResponse({ status: 200, description: 'Instructor dashboard metrics' })
  @Roles(UserRole.INSTRUCTOR)
  @Get('instructor')
  instructorDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.instructorDashboard(user.userId);
  }
}
