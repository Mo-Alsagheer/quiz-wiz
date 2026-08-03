import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { CategoryType } from 'src/common/enums/category-enum';
import { QuizStatus } from 'src/common/enums/quiz.status.enum';

export type QuizDocument = HydratedDocument<Quiz>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Quiz {
  @Prop({
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 200,
  })
  title: string;

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  description?: string;

  @Prop({
    required: true,
  })
  duration: number;

  @Prop({
    required: true,
    min: 1,
    max: 100,
  })
  numberOfQuestions: number;

  @Prop({
    required: true,
    min: 1,
    max: 100,
  })
  scorePerQuestion: number;

  @Prop({
    required: true,
  })
  scheduledDateTime: Date;

  @Prop({
    required: true,
    enum: DifficultyLevel,
  })
  difficultyLevel: DifficultyLevel;

  @Prop({
    required: true,
    enum: CategoryType,
  })
  categoryType: CategoryType;

  @Prop({
    type: [Types.ObjectId],
    ref: 'Group',
    required: true,
  })
  assignedToGroups: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'Question',
    required: true,
  })
  questions: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  instructorId: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
  })
  code: string;

  @Prop({
    required: true,
  })
  codeValidFrom: Date;

  @Prop({
    required: true,
  })
  codeValidUntil: Date;

  @Prop({
    enum: QuizStatus,
    default: QuizStatus.SCHEDULED,
  })
  status: QuizStatus;

  @Prop({
    default: false,
  })
  randomizeQuestions: boolean;

  @Prop({
    default: 0,
  })
  totalEnrolledStudents: number;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);

QuizSchema.index({
  instructorId: 1,
  scheduledDateTime: -1,
});

QuizSchema.index(
  {
    code: 1,
  },
  {
    unique: true,
  },
);

QuizSchema.index({
  status: 1,
});
