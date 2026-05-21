import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Movement } from '../../movements/entities/movement.entity';
import { UnitOfMeasure } from './unit-of-measure.enum';

@Entity({ name: 'products' })
@Index('idx_products_estado', ['estado'])
@Index('idx_products_categoria', ['categoria'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    name: 'unidad_de_medida',
    type: 'enum',
    enum: UnitOfMeasure,
    enumName: 'unit_of_measure_enum',
  })
  unidadDeMedida: UnitOfMeasure;

  @Column({ type: 'varchar', length: 100 })
  categoria: string;

  @Column({ name: 'stock_minimo', type: 'int', default: 0 })
  stockMinimo: number;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @OneToMany(() => Movement, (movement) => movement.product)
  movements: Movement[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
