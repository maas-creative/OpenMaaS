import {
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../services/payment.service';
import Stripe from 'stripe';

@ApiTags('webhooks')
@ApiExcludeController() // Exclude from Swagger docs
@Controller('webhooks')
export class WebhookController {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('stripe.secretKey') || '', {
      apiVersion: '2023-10-16',
    });
    this.webhookSecret = this.configService.get('stripe.webhookSecret') || '';
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(request.rawBody || Buffer.from(''), signature, this.webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Handle the event
    await this.paymentService.handleStripeWebhook(event);

    // Return a response to acknowledge receipt of the event
    return { received: true };
  }
}
