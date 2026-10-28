import type { Session } from '../../domain/types';

export function WorkoutEquipmentNotice({ session }: { session: Session }) {
  if (!session.equipmentOverride) return null;
  return (
    <p className="m-0 text-base font-bold">
      Passet använder tillfällig utrustning. Din hemutrustning och dina
      standardpass är oförändrade.
    </p>
  );
}
