import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CategoryType } from 'src/common/enums/category-enum';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';


export type QuestionDocument = HydratedDocument<Question>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Question {
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
          enum: ['A', 'B', 'C', 'D'],
          required: true,
        },
        text: {
          type: String,
          required: true,
          minlength: 2,
          maxlength: 200,
        },
      },
    ],
    required: true,
    validate: {
      validator(value: any[]) {
        return value.length === 4;
      },
      message: 'Question must have exactly 4 answers.',
    },
  })
  answers: {
    option: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];

  @Prop({
    required: true,
    enum: ['A', 'B', 'C', 'D'],
  })
  correctAnswer: 'A' | 'B' | 'C' | 'D';

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

export const QuestionSchema =
  SchemaFactory.createForClass(Question);

QuestionSchema.index({
  instructorId: 1,
  difficultyLevel: 1,
});

QuestionSchema.index({
  instructorId: 1,
  categoryType: 1,
});