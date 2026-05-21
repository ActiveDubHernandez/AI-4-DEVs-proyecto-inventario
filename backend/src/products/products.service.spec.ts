import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { UnitOfMeasure } from './entities/unit-of-measure.enum';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: jest.Mocked<Repository<Product>>;

  const productId = '11111111-1111-1111-1111-111111111111';

  const baseProduct: Product = {
    id: productId,
    nombre: 'Tornillo M6',
    descripcion: 'Acero',
    unidadDeMedida: UnitOfMeasure.UNIDADES,
    categoria: 'Ferretería',
    stockMinimo: 10,
    estado: true,
    movements: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
    productRepository = module.get(getRepositoryToken(Product));
  });

  it('should create a product successfully (happy path)', async () => {
    const createProductDto: CreateProductDto = {
      nombre: 'Cable UTP',
      descripcion: '5 metros',
      unidadDeMedida: UnitOfMeasure.UNIDADES,
      categoria: 'Redes',
      stockMinimo: 5,
    };

    productRepository.create.mockReturnValue({
      ...baseProduct,
      ...createProductDto,
      id: productId,
    });
    productRepository.save.mockResolvedValue({
      ...baseProduct,
      ...createProductDto,
    });

    const result = await service.create(createProductDto);

    expect(productRepository.create).toHaveBeenCalledWith({
      ...createProductDto,
      estado: true,
    });
    expect(productRepository.save).toHaveBeenCalled();
    expect(result.nombre).toBe('Cable UTP');
    expect(result.estado).toBe(true);
  });

  it('should throw NotFoundException when product does not exist', async () => {
    productRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(productId)).rejects.toThrow(NotFoundException);
  });

  it('should deactivate product logically on remove', async () => {
    productRepository.findOne.mockResolvedValue({ ...baseProduct });
    productRepository.save.mockImplementation(async (product) => product as Product);

    const result = await service.remove(productId);

    expect(result.estado).toBe(false);
    expect(productRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: productId, estado: false }),
    );
  });

  it('should never physically delete a product even if it has movements', async () => {
    productRepository.findOne.mockResolvedValue({
      ...baseProduct,
      movements: [{ id: 'movement-id' } as Product['movements'][number]],
    });
    productRepository.save.mockImplementation(async (product) => product as Product);

    await service.remove(productId);

    expect(productRepository.remove).not.toHaveBeenCalled();
    expect(productRepository.delete).not.toHaveBeenCalled();
    expect(productRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: false }),
    );
  });

  it('should list only active products by default', async () => {
    productRepository.find.mockResolvedValue([baseProduct]);

    await service.findAll();

    expect(productRepository.find).toHaveBeenCalledWith({
      where: { estado: true },
      order: { nombre: 'ASC' },
    });
  });
});
