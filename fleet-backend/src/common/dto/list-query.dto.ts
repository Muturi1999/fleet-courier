import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";

/** Shared list filters for paginated tenant resources */
export class ListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "YYYY-MM-DD — matches service/trip or created date" })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: "Route / destination substring" })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: "Legacy escape hatch — return full table (avoid in UI)" })
  @IsOptional()
  @IsString()
  all?: string;

  @ApiPropertyOptional({ description: "Billing month label e.g. Jun 2026" })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Client portal tab: awaiting | approved | returned | all" })
  @IsOptional()
  @IsString()
  tab?: string;

  @ApiPropertyOptional({ description: "Status filter (draft, sent, approved, etc.)" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Run type filter (Morning / Afternoon)" })
  @IsOptional()
  @IsString()
  runType?: string;

  @ApiPropertyOptional({ description: "Use keyset (cursor) pagination instead of OFFSET" })
  @IsOptional()
  @IsString()
  useKeyset?: string;

  @ApiPropertyOptional({ description: "Keyset cursor from prior page" })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ enum: ["next", "prev"], description: "Keyset page direction" })
  @IsOptional()
  @IsString()
  direction?: string;
}
