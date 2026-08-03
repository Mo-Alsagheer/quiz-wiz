import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { QuizzesService } from './quizzes.service';

import { CreateQuizDto } from 'src/dtos/create-quiz.dto';
import { UpdateQuizDto } from 'src/dtos/update-quiz.dto';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { UserRole } from 'src/common/enums/user-role.enum';
import { QuizStatus } from 'src/common/enums/quiz.status.enum';

@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class QuizController {
  constructor(
    private readonly quizService: QuizzesService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createQuizDto: CreateQuizDto,
  ) {
    return this.quizService.create(
      user.userId,
      createQuizDto,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: QuizStatus,
  ) {
    return this.quizService.findAll(
      user.userId,
      Number(page),
      Number(limit),
      status,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.quizService.findOne(
      id,
      user.userId,
    );
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
  ) {
    return this.quizService.update(
      id,
      user.userId,
      updateQuizDto,
    );
  }

  @Post(':id/reassign')
  reassign(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('scheduledDateTime')
    scheduledDateTime: string,
  ) {
    return this.quizService.reassign(
      id,
      user.userId,
      scheduledDateTime,
    );
  }
}