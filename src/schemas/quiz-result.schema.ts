import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuizResultDocument = HydratedDocument<QuizResult>;

@Schema({
  _id: false,
})
export class AnswerResult {
  @Prop({
    type: Types.ObjectId,
    ref: 'Question',
    required: true,
  })
  questionId: Types.ObjectId;

  @Prop({
    type: String,
    default: null,
  })
  selectedOption?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  correctOption?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  essayAnswer?: string | null;

  @Prop({
    required: true,
  })
  isCorrect: boolean;
}

export const AnswerResultSchema = SchemaFactory.createForClass(AnswerResult);

@Schema({
  timestamps: true,
  versionKey: false,
})
export class QuizResult {
  @Prop({
    type: Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  })
  quizId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  learnerId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Group',
  })
  groupId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'QuizAttempt',
    required: true,
  })
  attemptId: Types.ObjectId;

  @Prop({
    required: true,
  })
  submittedAt: Date;

  @Prop({
    required: true,
    min: 0,
  })
  totalScore: number;

  @Prop({
    required: true,
    min: 0,
    max: 100,
  })
  scorePercentage: number;

  @Prop({
    required: true,
    min: 0,
  })
  timeTaken: number;

  @Prop({
    type: [AnswerResultSchema],
    default: [],
  })
  answers: AnswerResult[];
}

export const QuizResultSchema = SchemaFactory.createForClass(QuizResult);

QuizResultSchema.index({
  learnerId: 1,
  submittedAt: -1,
});

QuizResultSchema.index({
  quizId: 1,
  learnerId: 1,
});

QuizResultSchema.index({
  groupId: 1,
});
