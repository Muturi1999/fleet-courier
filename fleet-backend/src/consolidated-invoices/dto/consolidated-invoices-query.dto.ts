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

  @ApiPropertyOptional({ description: "periodPreview=true returns grouped billable summary" })
  @IsOptional()
  @IsString()
  periodPreview?: string;

  @ApiPropertyOptional({ enum: ["vehicle", "route", "cls", "runType", "month"] })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cls?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  runType?: string;

  @ApiPropertyOptional({ description: "Matches trip route, vehicle run type, or destination" })
  @IsOptional()
  @IsString()
  runRoute?: string;
}
