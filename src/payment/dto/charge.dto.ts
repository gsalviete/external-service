import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { CardDataDto } from './card-data.dto';

export class ChargeDto {
  @IsNumber()
  @IsPositive()
  valor: number;

  @IsNumber()
  @IsNotEmpty()
  ciclista: number;

  @ValidateNested()
  @Type(() => CardDataDto)
  cardData: CardDataDto;
}
