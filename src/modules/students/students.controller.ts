import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';

@ApiTags('Students')
@ApiBearerAuth('bearer-auth')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // POST /students
  @ApiOperation({ summary: 'Add a new student to instructor management' })
  @ApiResponse({ status: 201, description: 'Student added successfully' })
  @ApiResponse({
    status: 400,
    description: 'Email already exists or validation error',
  })
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createStudentDto: CreateStudentDto,
  ) {
    return this.studentsService.create(user.userId, createStudentDto);
  }

  // GET /students
  @ApiOperation({
    summary:
      'Get all students for instructor with optional group and search filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of students with scores and stats',
  })
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() studentQueryDto: StudentQueryDto,
  ) {
    return this.studentsService.findAll(user.userId, studentQueryDto);
  }

  // GET /students/:id
  @ApiOperation({ summary: 'Get single student by ID with statistics' })
  @ApiResponse({ status: 200, description: 'Student details' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.studentsService.findOne(id, user.userId);
  }

  // PUT /students/:id
  @ApiOperation({ summary: 'Update student profile information' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, user.userId, updateStudentDto);
  }

  // DELETE /students/:id
  @ApiOperation({ summary: 'Delete a student and cascade removal from groups' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.studentsService.remove(id, user.userId);
  }
}
