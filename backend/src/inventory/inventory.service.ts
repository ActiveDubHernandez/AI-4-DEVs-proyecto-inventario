import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Movement } from '../movements/entities/movement.entity';
import { MovementType } from '../movements/entities/movement-type.enum';
import { Product } from '../products/entities/product.entity';
import { LowStockAlertDto } from './dto/low-stock-alert.dto';
import { ProductStockResponseDto } from './dto/product-stock-response.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
  ) {}

  /**
   * Calculates current stock as sum(entries) - sum(exits) using SQL aggregation.
   */
  async calculateCurrentStock(
    productId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const movementRepo = manager
      ? manager.getRepository(Movement)
      : this.movementRepository;

    const result = await movementRepo
      .createQueryBuilder('movement')
      .select(
        `COALESCE(SUM(CASE WHEN movement.tipo = :entrada THEN movement.cantidad ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN movement.tipo = :salida THEN movement.cantidad ELSE 0 END), 0)`,
        'currentStock',
      )
      .where('movement.productId = :productId', { productId })
      .setParameter('entrada', MovementType.ENTRADA)
      .setParameter('salida', MovementType.SALIDA)
      .getRawOne<{ currentStock: string }>();

    return Number(result?.currentStock ?? 0);
  }

  async getProductStock(productId: string): Promise<ProductStockResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    const currentStock = await this.calculateCurrentStock(productId);

    return {
      productId: product.id,
      nombre: product.nombre,
      currentStock,
      stockMinimo: product.stockMinimo,
      isBelowMinimum: currentStock <= product.stockMinimo,
    };
  }

  async getLowStockAlerts(): Promise<LowStockAlertDto[]> {
    const rows = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.movements', 'movement')
      .select('product.id', 'productId')
      .addSelect('product.nombre', 'nombre')
      .addSelect('product.categoria', 'categoria')
      .addSelect('product.stock_minimo', 'stockMinimo')
      .addSelect('product.unidad_de_medida', 'unidadDeMedida')
      .addSelect(
        `COALESCE(SUM(CASE WHEN movement.tipo = :entrada THEN movement.cantidad ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN movement.tipo = :salida THEN movement.cantidad ELSE 0 END), 0)`,
        'currentStock',
      )
      .where('product.estado = :estado', { estado: true })
      .setParameter('entrada', MovementType.ENTRADA)
      .setParameter('salida', MovementType.SALIDA)
      .groupBy('product.id')
      .addGroupBy('product.nombre')
      .addGroupBy('product.categoria')
      .addGroupBy('product.stock_minimo')
      .addGroupBy('product.unidad_de_medida')
      .having(
        `COALESCE(SUM(CASE WHEN movement.tipo = :entrada THEN movement.cantidad ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN movement.tipo = :salida THEN movement.cantidad ELSE 0 END), 0) <= product.stock_minimo`,
      )
      .orderBy('currentStock', 'ASC')
      .getRawMany<{
        productId: string;
        nombre: string;
        categoria: string;
        stockMinimo: string;
        unidadDeMedida: string;
        currentStock: string;
      }>();

    return rows.map((row) => ({
      productId: row.productId,
      nombre: row.nombre,
      categoria: row.categoria,
      currentStock: Number(row.currentStock),
      stockMinimo: Number(row.stockMinimo),
      unidadDeMedida: row.unidadDeMedida,
    }));
  }
}
