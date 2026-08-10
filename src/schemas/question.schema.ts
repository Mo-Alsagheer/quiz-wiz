import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CategoryType } from 'src/common/enums/category-enum';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { QuestionType } from 'src/common/enums/question-type.enum';

export type QuestionDocument = HydratedDocument<Question>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Question {
  @Prop({
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
    index: true,
  })
  type: QuestionType;

  @Prop({
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500,
  })
  title: string;

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  description?: string;

  @Prop({
    type: [
      {
        option: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
          minlength: 1,
          maxlength: 500,
        },
      },
    ],
    default: [],
  })
  answers: {
    option: string;
    text: string;
  }[];

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  correctAnswer?: string;

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
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  instructorId: Types.ObjectId;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

QuestionSchema.index({
  instructorId: 1,
  type: 1,
});

QuestionSchema.index({
  instructorId: 1,
  difficultyLevel: 1,
});

QuestionSchema.index({
  instructorId: 1,
  categoryType: 1,
});
