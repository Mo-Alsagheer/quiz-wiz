import { Body, ConflictException, HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserSchema , User, UserDocument } from '../../schemas/user.schema';
import { Model } from 'mongoose';
import { RegisterDto } from './../../dtos/register.dto';
import { error } from 'console';
import bcrypt from 'bcryptjs';
@Injectable()
export class AuthService {
constructor(@InjectModel(User.name) private readonly userModel:Model<UserDocument>){}

async register(body:RegisterDto){

    let { firstName , lastName , email , password } = body;

    let IsExist = await this.userModel.findOne({email});

    if(IsExist) throw new ConflictException(" email is already exist >>")

    let hashPassword = await bcrypt.hash(password, 10) ;

    const user = await this.userModel.create({ firstName , lastName , email , password : hashPassword });

return ( {message : " successful registration " , user})
      
}

}
