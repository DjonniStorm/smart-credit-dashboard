import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";

import { apiProductCatalogSchema } from "@repo/contracts/api";

import { CatalogService } from "./catalog.service.ts";

class ProductCatalogDto extends createZodDto(apiProductCatalogSchema) {}

@Controller("v1/products")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ operationId: "CatalogController_get" })
  @ApiOkResponse({ type: ProductCatalogDto })
  @ZodSerializerDto(ProductCatalogDto)
  get(): Promise<ProductCatalogDto> {
    return this.catalog.getCatalog();
  }
}
