import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('emails')
export class Email {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  assunto: string;

  @Column('text')
  mensagem: string;

  @CreateDateColumn()
  createdAt: Date;
}
