import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/entities/product.entity';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { Movement } from './entities/movement.entity';
import { MovementType } from './entities/movement-type.enum';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(createMovementDto: CreateMovementDto): Promise<Movement> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: createMovementDto.productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(
          `Producto con id ${createMovementDto.productId} no encontrado`,
        );
      }

      if (!product.estado) {
        throw new BadRequestException(
          'No se pueden registrar movimientos en un producto inactivo',
        );
      }

      if (createMovementDto.tipo === MovementType.SALIDA) {
        const currentStock = await this.inventoryService.calculateCurrentStock(
          createMovementDto.productId,
          manager,
        );

        if (createMovementDto.cantidad > currentStock) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${currentStock}, solicitado: ${createMovementDto.cantidad}`,
          );
        }
      }

      const movement = manager.create(Movement, {
        productId: createMovementDto.productId,
        tipo: createMovementDto.tipo,
        cantidad: createMovementDto.cantidad,
        fecha: createMovementDto.fecha,
        razon: createMovementDto.razon,
      });

      return manager.save(Movement, movement);
    });
  }

  async findAll(filters: FilterMovementsDto): Promise<Movement[]> {
    const queryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .orderBy('movement.fecha', 'DESC')
      .addOrderBy('movement.createdAt', 'DESC');

    this.applyFilters(queryBuilder, filters);

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Movement> {
    const movement = await this.movementRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!movement) {
      throw new NotFoundException(`Movimiento con id ${id} no encontrado`);
    }

    return movement;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Movement>,
    filters: FilterMovementsDto,
  ): void {
    if (filters.productId) {
      queryBuilder.andWhere('movement.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters.tipo) {
      queryBuilder.andWhere('movement.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters.fechaInicio) {
      queryBuilder.andWhere('movement.fecha >= :fechaInicio', {
        fechaInicio: filters.fechaInicio,
      });
    }

    if (filters.fechaFin) {
      queryBuilder.andWhere('movement.fecha <= :fechaFin', {
        fechaFin: filters.fechaFin,
      });
    }
  }
}
