import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { MfaSetupResponse, VerifyMfaRequest, EnableMfaRequest } from '@openmaas/types';
import { KeycloakService } from './keycloak.service';

@Injectable()
export class MfaService {
  private readonly issuer: string;

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly configService: ConfigService,
  ) {
    this.issuer = this.configService.get<string>('MFA_ISSUER') || 'OpenMaaS';
    
    // Set TOTP options
    authenticator.options = {
      window: [1, 1], // Allow 1 time step before and after
      step: 30, // 30 seconds time step
    };
  }

  /**
   * Generate a new MFA secret and QR code for a user
   */
  async setupMfa(userId: string, email: string): Promise<MfaSetupResponse> {
    // Generate a secret
    const secret = authenticator.generateSecret();
    
    // Generate service name and account name for QR code
    const serviceName = this.issuer;
    const accountName = email;
    const otpAuthUrl = authenticator.keyuri(accountName, serviceName, secret);

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes = this.generateBackupCodes(10);

    // Store the secret and backup codes temporarily in Keycloak attributes
    // Note: In production, you might want to encrypt the secret
    await this.keycloakService.setUserAttribute(userId, 'mfa_secret', secret);
    await this.keycloakService.setUserAttribute(userId, 'mfa_backup_codes', JSON.stringify(backupCodes));
    await this.keycloakService.setUserAttribute(userId, 'mfa_enabled', 'false'); // Not enabled until verified

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify and enable MFA for a user
   */
  async enableMfa(userId: string, request: EnableMfaRequest): Promise<void> {
    const { token } = request;

    // Get the stored secret
    const secret = await this.keycloakService.getUserAttribute(userId, 'mfa_secret');
    if (!secret) {
      throw new BadRequestException('MFA setup not found. Please run setup first.');
    }

    // Verify the token
    const isValid = this.verifyToken(secret, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    // Enable MFA
    await this.keycloakService.setUserAttribute(userId, 'mfa_enabled', 'true');
  }

  /**
   * Verify MFA token during login
   */
  async verifyMfa(userId: string, token: string): Promise<boolean> {
    // Check if MFA is enabled
    const mfaEnabled = await this.keycloakService.getUserAttribute(userId, 'mfa_enabled');
    if (mfaEnabled !== 'true') {
      // MFA not enabled, allow login
      return true;
    }

    // Get the secret
    const secret = await this.keycloakService.getUserAttribute(userId, 'mfa_secret');
    if (!secret) {
      // No secret found, deny login
      return false;
    }

    // Verify the token
    const isValidToken = this.verifyToken(secret, token);
    
    // If token is invalid, check backup codes
    if (!isValidToken) {
      const backupCodes = await this.keycloakService.getUserAttribute(userId, 'mfa_backup_codes');
      if (backupCodes) {
        const codes = JSON.parse(backupCodes) as string[];
        const index = codes.indexOf(token);
        if (index !== -1) {
          // Remove used backup code
          codes.splice(index, 1);
          await this.keycloakService.setUserAttribute(userId, 'mfa_backup_codes', JSON.stringify(codes));
          return true;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<void> {
    await this.keycloakService.setUserAttribute(userId, 'mfa_enabled', 'false');
    await this.keycloakService.setUserAttribute(userId, 'mfa_secret', '');
    await this.keycloakService.setUserAttribute(userId, 'mfa_backup_codes', '');
  }

  /**
   * Check if MFA is enabled for a user
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const mfaEnabled = await this.keycloakService.getUserAttribute(userId, 'mfa_enabled');
    return mfaEnabled === 'true';
  }

  /**
   * Verify TOTP token
   */
  private verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = this.generateBackupCodes(10);
    await this.keycloakService.setUserAttribute(userId, 'mfa_backup_codes', JSON.stringify(backupCodes));
    return backupCodes;
  }
}
