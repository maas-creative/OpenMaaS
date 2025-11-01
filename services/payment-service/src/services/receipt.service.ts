import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);
  private readonly receiptDir: string;

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly configService: ConfigService,
  ) {
    // Create receipts directory if it doesn't exist
    this.receiptDir = this.configService.get<string>('RECEIPT_DIR') || './receipts';
    if (!fs.existsSync(this.receiptDir)) {
      fs.mkdirSync(this.receiptDir, { recursive: true });
    }
  }

  /**
   * Generate a PDF receipt for a payment
   */
  async generateReceipt(userId: string, paymentId: string): Promise<string> {
    const payment = await this.paymentRepository.findByIdAndUserId(paymentId, userId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Receipt can only be generated for completed payments');
    }

    // Check if receipt already exists
    if (payment.receiptUrl) {
      return payment.receiptUrl;
    }

    // Generate PDF
    const filename = `receipt_${paymentId}_${Date.now()}.pdf`;
    const filepath = path.join(this.receiptDir, filename);
    const receiptUrl = `${this.configService.get<string>('BASE_URL') || 'http://localhost:3003'}/receipts/${filename}`;

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Pipe to file
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(24)
      .text('領収書', { align: 'center' })
      .moveDown(2);

    // Receipt number and date
    doc
      .fontSize(12)
      .text(`領収書番号: ${paymentId}`, { align: 'right' })
      .text(`発行日: ${this.formatDate(new Date())}`, { align: 'right' })
      .moveDown();

    // Company information
    doc
      .fontSize(14)
      .text('【お支払い先】', { underline: true })
      .fontSize(12)
      .text('OpenMaaS', 50, doc.y + 10)
      .text('〒100-0001 東京都千代田区千代田1-1-1', 50)
      .text('TEL: 03-1234-5678', 50)
      .moveDown();

    // Customer information
    doc
      .fontSize(14)
      .text('【お支払い者】', { underline: true })
      .fontSize(12)
      .text(payment.userId || '会員番号: ' + payment.userId, 50, doc.y + 10)
      .moveDown();

    // Payment details
    doc
      .fontSize(14)
      .text('【支払い内容】', { underline: true })
      .moveDown(0.5);

    // Table header
    doc.fontSize(10);
    const tableTop = doc.y;
    doc
      .text('項目', 50, tableTop)
      .text('数量', 200, tableTop)
      .text('単価', 300, tableTop)
      .text('金額', 400, tableTop, { align: 'right' })
      .moveDown(0.5);

    // Table line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Payment items
    const items = (payment as any).items || [];
    if (items.length === 0) {
      doc.text('交通費', 50);
      doc.text('1', 200);
      doc.text(`${payment.amount.toLocaleString()}円`, 300);
      doc.text(`${payment.amount.toLocaleString()}円`, 400, doc.y, { align: 'right' });
    } else {
      items.forEach((item: any) => {
        doc.text(item.name || '交通費', 50);
        doc.text((item.quantity || 1).toString(), 200);
        doc.text(`${(item.unitPrice || payment.amount).toLocaleString()}円`, 300);
        doc.text(`${(item.total || payment.amount).toLocaleString()}円`, 400, doc.y, { align: 'right' });
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('合計金額:', 350, doc.y)
      .text(`${payment.amount.toLocaleString()}円`, 400, doc.y, { align: 'right' })
      .font('Helvetica')
      .moveDown(2);

    // Payment method
    doc
      .fontSize(12)
      .text(`支払い方法: ${this.getPaymentMethodName((payment as any).paymentMethod || payment.provider || 'card')}`)
      .moveDown();

    // Payment date
    if (payment.completedAt) {
      doc.text(`支払い日時: ${this.formatDateTime(payment.completedAt)}`);
    }

    // Footer
    doc
      .fontSize(10)
      .text('※この領収書は自動発行されたものです。', 50, doc.page.height - 100, {
        align: 'center',
      })
      .text('※再発行はできません。', 50, doc.y + 5, { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Update payment with receipt URL
    await this.paymentRepository.update(paymentId, { receiptUrl });

    this.logger.log(`Receipt generated: ${filepath}`);

    return receiptUrl;
  }

  /**
   * Get receipt URL for a payment
   */
  async getReceiptUrl(userId: string, paymentId: string): Promise<string | null> {
    const payment = await this.paymentRepository.findByIdAndUserId(paymentId, userId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.receiptUrl) {
      return payment.receiptUrl;
    }

    // Generate receipt if it doesn't exist
    if (payment.status === 'completed') {
      return this.generateReceipt(userId, paymentId);
    }

    return null;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  private formatDateTime(date: Date): string {
    const formattedDate = this.formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${formattedDate} ${hours}:${minutes}`;
  }

  private getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      card: 'クレジットカード',
      cash: '現金',
      bank_transfer: '銀行振込',
      e_money: '電子マネー',
      qr_code: 'QRコード決済',
    };
    return methods[method] || method;
  }
}
