import { IsString, Matches, IsOptional } from 'class-validator';

export class CardDataDto {
  // Optional: Stripe PaymentMethod ID (starts with pm_)
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional() // Optional if paymentMethodId is provided
  @Matches(/^\d{13,19}$/, { message: 'Card number must be 13-19 digits' })
  numero?: string;

  @IsString()
  @IsOptional()
  nomeTitular?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Expiration date must be in MM/YYYY format',
  })
  validade?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3 or 4 digits' })
  cvv?: string;
}
