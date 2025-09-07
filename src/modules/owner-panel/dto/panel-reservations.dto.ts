import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export const ReservationStatuses = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
] as const;
export type ReservationStatus = (typeof ReservationStatuses)[number];

export class ListReservationsQueryDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsIn(ReservationStatuses as readonly string[])
  status?: ReservationStatus;
}

export class SetReservationStatusDto {
  @IsIn(ReservationStatuses as unknown as string[])
  status!: ReservationStatus;
}

export class AssignTableDto {
  @IsInt()
  tableId!: number;
}
