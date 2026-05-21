import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  applyMovementWithNonNegativeGuard,
  calculateStockFromMovements,
} from './common/utils/stock.math';
import { InventoryService } from './inventory/inventory.service';
import { Movement } from './movements/entities/movement.entity';
import { MovementReason } from './movements/entities/movement-reason.enum';
import { MovementType } from './movements/entities/movement-type.enum';
import { MovementsService } from './movements/movements.service';
import { Product } from './products/entities/product.entity';
import { UnitOfMeasure } from './products/entities/unit-of-measure.enum';

/**
 * Hyper-specific tests designed to kill course mutants M3, M4 and M8.
 */
describe('Critical mutants (M3, M4, M8)', () => {
  describe('M3 - salida boundary validation (MovementsService)', () => {
    let movementsService: MovementsService;
    let inventoryService: { calculateCurrentStock: jest.Mock };
    let manager: {
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };

    const productId = '123e4567-e89b-12d3-a456-426614174000';
    const stockActual = 12;

    const activeProduct: Product = {
      id: productId,
      nombre: 'Mutant M3',
      descripcion: null,
      unidadDeMedida: UnitOfMeasure.UNIDADES,
      categoria: 'Test',
      stockMinimo: 0,
      estado: true,
      movements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      manager = {
        findOne: jest.fn().mockResolvedValue(activeProduct),
        create: jest.fn((_, payload) => payload),
        save: jest.fn(async (_entity, payload) => ({
          id: 'movement-id',
          ...payload,
        })),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MovementsService,
          { provide: getRepositoryToken(Movement), useValue: {} },
          { provide: getRepositoryToken(Product), useValue: {} },
          {
            provide: getDataSourceToken(),
            useValue: {
              transaction: jest.fn(
                async (
                  callback: (entityManager: EntityManager) => Promise<unknown>,
                ) => callback(manager as unknown as EntityManager),
              ),
            },
          },
          {
            provide: InventoryService,
            useValue: { calculateCurrentStock: jest.fn() },
          },
        ],
      }).compile();

      movementsService = module.get(MovementsService);
      inventoryService = module.get(InventoryService);
      inventoryService.calculateCurrentStock.mockResolvedValue(stockActual);
    });

    it('rejects salida when cantidad is exactly stockActual + 1', async () => {
      await expect(
        movementsService.create({
          productId,
          tipo: MovementType.SALIDA,
          cantidad: stockActual + 1,
          fecha: new Date('2026-05-19'),
          razon: MovementReason.VENTA,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('accepts salida when cantidad is exactly stockActual', async () => {
      const result = await movementsService.create({
        productId,
        tipo: MovementType.SALIDA,
        cantidad: stockActual,
        fecha: new Date('2026-05-19'),
        razon: MovementReason.VENTA,
      });

      expect(result.cantidad).toBe(stockActual);
      expect(manager.save).toHaveBeenCalledTimes(1);
    });

    it('rejects salida when cantidad is stockActual + 1 at guard level', () => {
      const guardResult = applyMovementWithNonNegativeGuard(
        stockActual,
        MovementType.SALIDA,
        stockActual + 1,
      );

      expect(guardResult.accepted).toBe(false);
      expect(guardResult.newStock).toBe(stockActual);
    });

    it('accepts salida when cantidad equals stockActual at guard level', () => {
      const guardResult = applyMovementWithNonNegativeGuard(
        stockActual,
        MovementType.SALIDA,
        stockActual,
      );

      expect(guardResult.accepted).toBe(true);
      expect(guardResult.newStock).toBe(0);
    });
  });

  describe('M4 - movement type arithmetic isolation', () => {
    it('adds stock only for entrada movements in isolation', () => {
      const onlyEntrada = calculateStockFromMovements([
        { tipo: MovementType.ENTRADA, cantidad: 9 },
      ]);

      expect(onlyEntrada).toBe(9);
      expect(onlyEntrada).not.toBe(-9);
    });

    it('subtracts stock only for salida movements in isolation', () => {
      const onlySalida = calculateStockFromMovements([
        { tipo: MovementType.SALIDA, cantidad: 9 },
      ]);

      expect(onlySalida).toBe(-9);
      expect(onlySalida).not.toBe(9);
    });

    it('applies entrada then salida with strict opposite effects', () => {
      const stock = calculateStockFromMovements([
        { tipo: MovementType.ENTRADA, cantidad: 20 },
        { tipo: MovementType.SALIDA, cantidad: 7 },
      ]);

      expect(stock).toBe(13);
      expect(stock).not.toBe(27);
      expect(stock).not.toBe(-13);
    });

    it('uses opposite deltas for entrada vs salida with same cantidad', () => {
      const entradaResult = applyMovementWithNonNegativeGuard(
        0,
        MovementType.ENTRADA,
        6,
      );
      const salidaResult = applyMovementWithNonNegativeGuard(
        6,
        MovementType.SALIDA,
        6,
      );

      expect(entradaResult.newStock).toBe(6);
      expect(salidaResult.newStock).toBe(0);
      expect(entradaResult.newStock - salidaResult.newStock).toBe(6);
    });

    it('registers SQL aggregation with distinct entrada and salida parameters', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ currentStock: '4' }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InventoryService,
          {
            provide: getRepositoryToken(Movement),
            useValue: {
              createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            },
          },
          {
            provide: getRepositoryToken(Product),
            useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() },
          },
        ],
      }).compile();

      const inventoryService = module.get(InventoryService);
      await inventoryService.calculateCurrentStock(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      const selectExpression = queryBuilder.select.mock.calls[0][0] as string;

      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'entrada',
        MovementType.ENTRADA,
      );
      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'salida',
        MovementType.SALIDA,
      );
      expect(selectExpression).toContain('movement.tipo = :entrada');
      expect(selectExpression).toContain('movement.tipo = :salida');
      expect(selectExpression.indexOf(':entrada')).toBeLessThan(
        selectExpression.indexOf(':salida'),
      );
    });
  });

  describe('M8 - minimum stock alert exact boundary', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174001';
    const stockMinimo = 15;

    const product: Product = {
      id: productId,
      nombre: 'Producto límite',
      descripcion: null,
      unidadDeMedida: UnitOfMeasure.UNIDADES,
      categoria: 'Alertas',
      stockMinimo,
      estado: true,
      movements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let inventoryService: InventoryService;
    let productRepository: {
      findOne: jest.Mock;
      createQueryBuilder: jest.Mock;
    };

    beforeEach(async () => {
      productRepository = {
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InventoryService,
          {
            provide: getRepositoryToken(Movement),
            useValue: { createQueryBuilder: jest.fn() },
          },
          {
            provide: getRepositoryToken(Product),
            useValue: productRepository,
          },
        ],
      }).compile();

      inventoryService = module.get(InventoryService);
    });

    it('flags alert when currentStock is exactly equal to stockMinimo', async () => {
      productRepository.findOne.mockResolvedValue(product);
      jest
        .spyOn(inventoryService, 'calculateCurrentStock')
        .mockResolvedValue(stockMinimo);

      const stockResponse = await inventoryService.getProductStock(productId);

      expect(stockResponse.currentStock).toBe(stockMinimo);
      expect(stockResponse.stockMinimo).toBe(stockMinimo);
      expect(stockResponse.isBelowMinimum).toBe(true);
    });

    it('does not flag alert when currentStock is exactly stockMinimo + 1', async () => {
      productRepository.findOne.mockResolvedValue(product);
      jest
        .spyOn(inventoryService, 'calculateCurrentStock')
        .mockResolvedValue(stockMinimo + 1);

      const stockResponse = await inventoryService.getProductStock(productId);

      expect(stockResponse.currentStock).toBe(stockMinimo + 1);
      expect(stockResponse.isBelowMinimum).toBe(false);
    });

    it('includes product in low-stock alerts when stock equals minimum exactly', async () => {
      const alertsQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            productId,
            nombre: product.nombre,
            categoria: product.categoria,
            stockMinimo: String(stockMinimo),
            unidadDeMedida: product.unidadDeMedida,
            currentStock: String(stockMinimo),
          },
        ]),
      };

      productRepository.createQueryBuilder.mockReturnValue(alertsQueryBuilder);

      const alerts = await inventoryService.getLowStockAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].currentStock).toBe(stockMinimo);
      expect(alerts[0].stockMinimo).toBe(stockMinimo);
      expect(alerts[0].productId).toBe(productId);
      expect(alertsQueryBuilder.having).toHaveBeenCalledWith(
        expect.stringContaining('<= product.stock_minimo'),
      );
    });

    it('uses inclusive <= comparison in low-stock HAVING clause', async () => {
      const alertsQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      productRepository.createQueryBuilder.mockReturnValue(alertsQueryBuilder);
      await inventoryService.getLowStockAlerts();

      const havingClause = alertsQueryBuilder.having.mock.calls[0][0] as string;
      expect(havingClause).toMatch(/<=\s*product\.stock_minimo/);
      expect(havingClause).not.toMatch(/<\s*product\.stock_minimo/);
    });
  });
});
