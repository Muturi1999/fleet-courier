import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { ListQueryDto } from "../../common/dto/list-query.dto";

export class NotificationsQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ["admin", "client"] })
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiPropertyOptional({ description: "Unread only when true" })
  @IsOptional()
  @IsString()
  unread?: string;
}
