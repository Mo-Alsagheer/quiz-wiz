import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { QuizAttemptsService } from './quiz-attempts.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { JoinQuizDto } from 'src/dtos/join-quiz.dto';
import { SubmitQuizDto } from 'src/dtos/submit-quiz.dto';

@Controller('quizattempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
export class QuizAttemptsController {
  constructor(private readonly quizAttemptsService: QuizAttemptsService) {}

  // POST /quizattempts/join
  @Post('join')
  joinQuiz(@CurrentUser() user: any, @Body() joinQuizDto: JoinQuizDto) {
    return this.quizAttemptsService.joinQuiz(user.userId, joinQuizDto);
  }

  // POST /quizattempts/:quizId/submit
  @Post(':quizId/submit')
  submitQuiz(
    @CurrentUser() user: any,
    @Param('quizId') quizId: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ) {
    return this.quizAttemptsService.submitQuiz(
      user.userId,
      quizId,
      submitQuizDto,
    );
  }
}
