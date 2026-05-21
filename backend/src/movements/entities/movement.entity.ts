import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { MovementReason } from './movement-reason.enum';
import { MovementType } from './movement-type.enum';

@Entity({ name: 'movements' })
@Index('idx_movements_product_id', ['productId'])
@Index('idx_movements_product_fecha', ['productId', 'fecha'])
export class Movement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MovementType,
    enumName: 'movement_type_enum',
  })
  tipo: MovementType;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({
    type: 'enum',
    enum: MovementReason,
    enumName: 'movement_reason_enum',
  })
  razon: MovementReason;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.movements, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
