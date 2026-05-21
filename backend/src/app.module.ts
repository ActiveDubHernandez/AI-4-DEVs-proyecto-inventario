import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { Movement } from './movements/entities/movement.entity';
import { MovementsModule } from './movements/movements.module';
import { Product } from './products/entities/product.entity';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = process.env.DATABASE_URL;
        const sharedOptions = {
          type: 'postgres' as const,
          entities: [Product, Movement],
          synchronize:
            configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
          logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
        };

        if (databaseUrl) {
          return {
            ...sharedOptions,
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
          };
        }

        return {
          ...sharedOptions,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'inventario'),
          ssl: false,
        };
      },
    }),
    ProductsModule,
    MovementsModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
