import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { EntityManager } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/entities/product.entity';
import { UnitOfMeasure } from '../products/entities/unit-of-measure.enum';
import { Movement } from './entities/movement.entity';
import { MovementReason } from './entities/movement-reason.enum';
import { MovementType } from './entities/movement-type.enum';
import { MovementsService } from './movements.service';

describe('MovementsService PBT integration', () => {
  let service: MovementsService;
  let inventoryService: { calculateCurrentStock: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const productId = '11111111-1111-1111-1111-111111111111';

  const activeProduct: Product = {
    id: productId,
    nombre: 'PBT Product',
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
      save: jest.fn(async (payload) => ({ id: 'generated-id', ...payload })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        {
          provide: getRepositoryToken(Movement),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {},
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: jest.fn(
              async (callback: (entityManager: EntityManager) => Promise<unknown>) =>
                callback(manager as unknown as EntityManager),
            ),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            calculateCurrentStock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MovementsService);
    inventoryService = module.get(InventoryService);
  });

  /**
   * P1 at service layer: salida above mocked stock is always rejected.
   */
  it('P1: service rejects salida when cantidad exceeds calculated stock', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: 1, max: 300 }),
        async (currentStock, extra) => {
          inventoryService.calculateCurrentStock.mockResolvedValue(currentStock);

          await expect(
            service.create({
              productId,
              tipo: MovementType.SALIDA,
              cantidad: currentStock + extra,
              fecha: new Date('2026-05-19'),
              razon: MovementReason.VENTA,
            }),
          ).rejects.toThrow(BadRequestException);

          expect(manager.save).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 80 },
    );
  });
});
