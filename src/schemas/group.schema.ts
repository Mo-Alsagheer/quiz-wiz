import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Group {
  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  groupName: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  instructorId: Types.ObjectId;

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'User',
      },
    ],
    default: [],
  })
  learners: Types.ObjectId[];

  @Prop({
    default: 0,
    min: 0,
  })
  learnerCount: number;
}

export const GroupSchema = SchemaFactory.createForClass(Group);


GroupSchema.index(
  {
    instructorId: 1,
    groupName: 1,
  },
  {
    unique: true,
  },
);

GroupSchema.index({
  learners: 1,
});