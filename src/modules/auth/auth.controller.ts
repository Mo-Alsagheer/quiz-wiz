import { Body, Controller } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { RegisterDto } from 'src/dtos/register.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authController:AuthController){}

@Post("register")
register(@Body() body: RegisterDto){
   return this.authController.register(body)
}
}
