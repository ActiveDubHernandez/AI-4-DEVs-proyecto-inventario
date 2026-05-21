import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products/:productId/stock')
  getProductStock(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getProductStock(productId);
  }

  @Get('alerts/low-stock')
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }
}
