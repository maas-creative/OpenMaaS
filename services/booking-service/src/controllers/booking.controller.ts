import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BookingService } from '../services/booking.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  BookingSearchDto,
  BookingResponseDto,
  BookingListResponseDto,
} from '../dto/booking.dto';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid booking request' })
  @ApiResponse({ status: 403, description: 'Booking limit exceeded' })
  async createBooking(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBooking(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiResponse({
    status: 200,
    description: 'List of user bookings',
    type: BookingListResponseDto,
  })
  async getBookings(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Query() search: BookingSearchDto,
  ): Promise<BookingListResponseDto> {
    return this.bookingService.getBookings(req.user.userId, search);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get user active bookings' })
  @ApiResponse({
    status: 200,
    description: 'List of active bookings',
    type: [BookingResponseDto],
  })
  async getActiveBookings(@Request() req: ExpressRequest & { user: { userId: string } }): Promise<BookingResponseDto[]> {
    return this.bookingService.getUserActiveBookings(req.user.userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get user upcoming bookings (next 24 hours)' })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming bookings',
    type: [BookingResponseDto],
  })
  async getUpcomingBookings(@Request() req: ExpressRequest & { user: { userId: string } }): Promise<BookingResponseDto[]> {
    return this.bookingService.getUserUpcomingBookings(req.user.userId);
  }

  @Get('confirmation/:confirmationCode')
  @ApiOperation({ summary: 'Get booking by confirmation code' })
  @ApiParam({ name: 'confirmationCode', description: 'Booking confirmation code' })
  @ApiResponse({
    status: 200,
    description: 'Booking details',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingByConfirmationCode(
    @Param('confirmationCode') confirmationCode: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.getBookingByConfirmationCode(confirmationCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking details',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getBooking(@Request() req: ExpressRequest & { user: { userId: string } }, @Param('id') id: string): Promise<BookingResponseDto> {
    return this.bookingService.getBooking(req.user.userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking updated successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Cannot update booking in current status' })
  async updateBooking(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.updateBooking(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Cannot cancel booking in current status' })
  async cancelBooking(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.cancelBooking(req.user.userId, id, dto);
  }
}
