import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/entities/product.entity';
import { UnitOfMeasure } from '../products/entities/unit-of-measure.enum';
import { CreateMovementDto } from './dto/create-movement.dto';
import { Movement } from './entities/movement.entity';
import { MovementReason } from './entities/movement-reason.enum';
import { MovementType } from './entities/movement-type.enum';
import { MovementsService } from './movements.service';

describe('MovementsService', () => {
  let service: MovementsService;
  let inventoryService: jest.Mocked<Pick<InventoryService, 'calculateCurrentStock'>>;
  let dataSource: { transaction: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const productId = '11111111-1111-1111-1111-111111111111';
  const movementId = '22222222-2222-2222-2222-222222222222';

  const activeProduct: Product = {
    id: productId,
    nombre: 'Producto test',
    descripcion: null,
    unidadDeMedida: UnitOfMeasure.UNIDADES,
    categoria: 'General',
    stockMinimo: 0,
    estado: true,
    movements: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseMovementDto: CreateMovementDto = {
    productId,
    tipo: MovementType.ENTRADA,
    cantidad: 10,
    fecha: new Date('2026-05-19'),
    razon: MovementReason.COMPRA,
  };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (callback: (entityManager: EntityManager) => Promise<Movement>) =>
        callback(manager as unknown as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        {
          provide: getRepositoryToken(Movement),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
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

  it('should register an entrada movement inside a transaction (happy path)', async () => {
    manager.findOne.mockResolvedValue(activeProduct);
    manager.create.mockReturnValue({ id: movementId, ...baseMovementDto });
    manager.save.mockResolvedValue({ id: movementId, ...baseMovementDto });

    const result = await service.create(baseMovementDto);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.findOne).toHaveBeenCalledWith(Product, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(inventoryService.calculateCurrentStock).not.toHaveBeenCalled();
    expect(result.tipo).toBe(MovementType.ENTRADA);
  });

  it('should register a salida movement when stock is sufficient', async () => {
    const salidaDto: CreateMovementDto = {
      ...baseMovementDto,
      tipo: MovementType.SALIDA,
      cantidad: 4,
      razon: MovementReason.VENTA,
    };

    manager.findOne.mockResolvedValue(activeProduct);
    inventoryService.calculateCurrentStock.mockResolvedValue(10);
    manager.create.mockReturnValue({ id: movementId, ...salidaDto });
    manager.save.mockResolvedValue({ id: movementId, ...salidaDto });

    const result = await service.create(salidaDto);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(inventoryService.calculateCurrentStock).toHaveBeenCalledWith(
      productId,
      manager,
    );
    expect(result.tipo).toBe(MovementType.SALIDA);
    expect(result.cantidad).toBe(4);
  });

  it('should reject salida when cantidad exceeds available stock', async () => {
    const salidaDto: CreateMovementDto = {
      ...baseMovementDto,
      tipo: MovementType.SALIDA,
      cantidad: 15,
      razon: MovementReason.VENTA,
    };

    manager.findOne.mockResolvedValue(activeProduct);
    inventoryService.calculateCurrentStock.mockResolvedValue(10);

    await expect(service.create(salidaDto)).rejects.toThrow(BadRequestException);
    await expect(service.create(salidaDto)).rejects.toThrow(/Stock insuficiente/);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('should reject movement creation for inactive products', async () => {
    manager.findOne.mockResolvedValue({ ...activeProduct, estado: false });

    await expect(service.create(baseMovementDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('should reject movement creation when product is not found', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(service.create(baseMovementDto)).rejects.toThrow(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
