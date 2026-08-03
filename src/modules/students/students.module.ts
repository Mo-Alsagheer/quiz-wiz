import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Group, GroupSchema } from 'src/schemas/group.schema';
import { QuizResult, QuizResultSchema } from 'src/schemas/quiz-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Group.name, schema: GroupSchema },
      { name: QuizResult.name, schema: QuizResultSchema },
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
