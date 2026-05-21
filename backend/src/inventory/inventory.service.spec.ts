import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movement } from '../movements/entities/movement.entity';
import { Product } from '../products/entities/product.entity';
import { UnitOfMeasure } from '../products/entities/unit-of-measure.enum';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let movementRepository: {
    createQueryBuilder: jest.Mock;
  };
  let productRepository: jest.Mocked<Pick<Repository<Product>, 'findOne'>>;

  const productId = '11111111-1111-1111-1111-111111111111';

  const product: Product = {
    id: productId,
    nombre: 'Producto inventario',
    descripcion: null,
    unidadDeMedida: UnitOfMeasure.KG,
    categoria: 'Materia prima',
    stockMinimo: 20,
    estado: true,
    movements: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    movementRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Movement),
          useValue: movementRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(InventoryService);
    productRepository = module.get(getRepositoryToken(Product));
  });

  it('should calculate current stock from aggregation query', async () => {
    const queryBuilder = movementRepository.createQueryBuilder();
    queryBuilder.getRawOne.mockResolvedValue({ currentStock: '37' });

    const stock = await service.calculateCurrentStock(productId);

    expect(stock).toBe(37);
    expect(movementRepository.createQueryBuilder).toHaveBeenCalledWith('movement');
  });

  it('should return zero stock when product has no movements', async () => {
    const queryBuilder = movementRepository.createQueryBuilder();
    queryBuilder.getRawOne.mockResolvedValue({ currentStock: '0' });

    const stock = await service.calculateCurrentStock(productId);

    expect(stock).toBe(0);
  });

  it('should expose isBelowMinimum in getProductStock response', async () => {
    productRepository.findOne.mockResolvedValue(product);
    jest.spyOn(service, 'calculateCurrentStock').mockResolvedValue(15);

    const result = await service.getProductStock(productId);

    expect(result.currentStock).toBe(15);
    expect(result.stockMinimo).toBe(20);
    expect(result.isBelowMinimum).toBe(true);
  });

  it('should throw NotFoundException when product does not exist in getProductStock', async () => {
    productRepository.findOne.mockResolvedValue(null);

    await expect(service.getProductStock(productId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
