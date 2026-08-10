import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuizAttemptDocument = HydratedDocument<QuizAttempt>;

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class QuizAttempt {
  @Prop({
    type: Types.ObjectId,
    ref: 'Quiz',
    required: true,
  })
  quizId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  learnerId: Types.ObjectId;

  @Prop({
    required: true,
  })
  attemptStartTime: Date;

  @Prop({
    required: true,
  })
  attemptEndTime: Date;

  @Prop({
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Prop({
    type: [
      {
        questionId: {
          type: Types.ObjectId,
          ref: 'Question',
        },
        selectedOption: String,
      },
    ],
    default: [],
  })
  answers: {
    questionId: Types.ObjectId;
    selectedOption: string;
  }[];
}

export const QuizAttemptSchema = SchemaFactory.createForClass(QuizAttempt);
