import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Group ,GroupSchema } from 'src/schemas/group.schema';
import { QuizResult , QuizResultSchema } from 'src/schemas/quiz-result.schema';
import { Quiz , QuizSchema } from 'src/schemas/quiz.schema';

@Module({
       imports:[ MongooseModule.forFeature([
  {
    name: Group.name,
    schema: GroupSchema,
  },
  {
    name: Quiz.name,
    schema: QuizSchema,
  },
  {
    name: QuizResult.name,
    schema: QuizResultSchema,
  },
])],
      controllers: [DashboardController],
      providers: [DashboardService],
})
export class DashboardModule {}
