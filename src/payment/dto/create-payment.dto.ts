import { IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  valor: number;

  @IsNumber()
  @IsNotEmpty()
  ciclista: number;
}
