import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UserRole } from 'src/common/enums/user-role.enum';
import { HydratedDocument } from 'mongoose';


export type UserDocument = HydratedDocument<User>;

@Schema({timestamps:true , versionKey : false})
export class User {
@Prop({required:true , trim: true})
firstName:string

@Prop({required:true , trim: true})
lastName:string

@Prop({enum:Object.values(UserRole) , default:UserRole.LEARNER})
role: UserRole 

@Prop({required:true , trim: true , unique:true , lowercase:true})
email:string
 
 
@Prop({required:true , select: false, })
password:string
 


@Prop()
phone?:string

@Prop()
image?:string

@Prop({default: true})
isActive:boolean


@Prop({
  select: false,
})
passwordResetToken?: string;

@Prop({
  select: false,
})
passwordResetExpires?: Date;

@Prop()
passwordChangedAt?: Date;

    }



export const UserSchema = SchemaFactory.createForClass(User)

UserSchema.index({email:1},{unique:true})
