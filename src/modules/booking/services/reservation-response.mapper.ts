import type { ReservationResponseDto } from '../dto/reservation-response.dto';
import type { Reservation } from '../entities/reservation.entity';

export function toReservationResponse(
  reservation: Reservation,
  roomNumberByRoomId: ReadonlyMap<string, string> = new Map(),
): ReservationResponseDto {
  const items = [...(reservation.items ?? [])].sort((left, right) =>
    left.roomTypeId.localeCompare(right.roomTypeId),
  );

  return {
    id: reservation.id,
    customerId: reservation.customerId,
    contactName: reservation.contactName,
    contactPhone: reservation.contactPhone,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    guestCount: reservation.guestCount,
    status: reservation.status,
    totalAmount: reservation.totalAmount,
    expiresAt: reservation.expiresAt.toISOString(),
    paymentStatus: reservation.paymentStatus,
    cancellationReason: reservation.cancellationReason,
    checkedInAt: reservation.checkedInAt?.toISOString() ?? null,
    checkedOutAt: reservation.checkedOutAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    items: items.map((item) => ({
      roomTypeId: item.roomTypeId,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
    })),
    assignments: items
      .flatMap((item) => item.assignments ?? [])
      .flatMap((assignment) => {
        const roomNumber = roomNumberByRoomId.get(assignment.roomId);

        return roomNumber === undefined ? [] : [{ roomId: assignment.roomId, roomNumber }];
      })
      .sort((left, right) => left.roomId.localeCompare(right.roomId)),
  };
}
