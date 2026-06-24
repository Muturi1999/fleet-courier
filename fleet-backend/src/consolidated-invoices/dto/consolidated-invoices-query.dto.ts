import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { ListQueryDto } from "../../common/dto/list-query.dto";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ConsolidatedInvoicesQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unbilled?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicles?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plate?: string;
}
