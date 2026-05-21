import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { LowStockAlertDto } from './dto/low-stock-alert.dto';
import { ProductStockResponseDto } from './dto/product-stock-response.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('alerts/low-stock')
  getLowStockAlerts(): Promise<LowStockAlertDto[]> {
    return this.inventoryService.getLowStockAlerts();
  }

  @Get('products/:productId/stock')
  getProductStock(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductStockResponseDto> {
    return this.inventoryService.getProductStock(productId);
  }
}
