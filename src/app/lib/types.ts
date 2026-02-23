export type Shift = "morning" | "afternoon";

export type Driver = {
  id: string;
  name: string;
  routeNumber: string;
  licensePlate: string;
  contactNumber?: string;
  email?: string;
  isActive: boolean;
};

export type RouteLog = {
  id: string;
  driverId: string;
  routeNumber: string;
  licensePlate: string;
  logDate: string; // YYYY-MM-DD
  morningCheckIn?: number;
  morningCheckOut?: number;
  morningObservations?: string;
  morningSignature?: string;
  afternoonCheckIn?: number;
  afternoonCheckOut?: number;
  afternoonObservations?: string;
  afternoonSignature?: string;
};

export type RouteLogWithDriver = RouteLog & { driver?: Driver };
