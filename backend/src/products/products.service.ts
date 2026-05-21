import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      estado: createProductDto.estado ?? true,
    });

    return this.productRepository.save(product);
  }

  async findAll(includeInactive = false): Promise<Product[]> {
    if (includeInactive) {
      return this.productRepository.find({
        order: { nombre: 'ASC' },
      });
    }

    return this.productRepository.find({
      where: { estado: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  /**
   * Soft-deletes the product (estado = false). Physical delete is never performed.
   */
  async remove(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.estado = false;
    return this.productRepository.save(product);
  }
}
