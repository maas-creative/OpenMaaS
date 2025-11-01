import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code or 8-character backup code' })
  @IsString()
  @Length(6, 8)
  token!: string;
}

export class EnableMfaDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code to verify setup' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Token must be a 6-digit number' })
  token!: string;
}
