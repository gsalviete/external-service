import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CardDataDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{13,19}$/, { message: 'Card number must be 13-19 digits' })
  numero: string;

  @IsString()
  @IsNotEmpty()
  nomeTitular: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Expiration date must be in MM/YYYY format',
  })
  validade: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3 or 4 digits' })
  cvv: string;
}
