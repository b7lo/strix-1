export interface DashboardStats {
  totalAccidents: number;
  totalFalseAlarms: number;
  totalMatchedAccidents: number;
  totalAssessments: number;
  totalLeads: number;
  averageNajmDifference: number | null;
  averageGForce: number;
  accidentsBySeverity: { severity: string; count: number }[];
  accidentsByImpactZone: { zone: string; count: number }[];
  accidentsByDay: { date: string; count: number }[];
}

export interface DashboardAccident {
  id: string;
  deviceId: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  peakGForce: number;
  impactZone: string;
  impactDirection: string;
  speedKmh: number;
  severity: string;
  matchedAccidentId: string | null;
  matchConfidence: number | null;
  hasAssessment: boolean;
  liabilityDifference: number | null;
  isFalseAlarm: boolean;
}

export interface DashboardAssessment {
  id: string;
  accidentId: string;
  appLiabilityUser: number;
  appLiabilityOther: number;
  najmLiabilityUser: number | null;
  najmLiabilityOther: number | null;
  liabilityDifference: number | null;
  userDescription: string | null;
  assessedAt: string;
  accidentTimestamp: string;
  accidentSeverity: string;
}

export interface DashboardMatched {
  id: string;
  accidentAId: string;
  accidentBId: string;
  consistencyStatus: string;
  liabilityAPercent: number;
  liabilityBPercent: number;
  verifiedImpactZoneA: string;
  verifiedImpactZoneB: string;
  createdAt: string;
  accidentA_deviceId: string;
  accidentA_timestamp: string;
  accidentA_severity: string;
}

export interface DashboardFalseAlarm {
  id: string;
  accidentId: string | null;
  deviceId: string;
  peakGForce: number | null;
  reportedAt: string;
  reason: string;
  details: string | null;
  timestamp: string | null;
}

export interface DashboardLead {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  createdAt: string;
}

// العرض الموحّد لحالة واحدة: الحادث + تقييمه + إنذاره الكاذب + مطابقته
export interface AccidentDetail {
  accident: {
    id: string;
    deviceId: string;
    timestamp: string;
    latitude: number | null;
    longitude: number | null;
    peakGForce: number;
    impactZone: string;
    impactDirection: string;
    speedKmh: number;
    severity: string;
    matchedAccidentId: string | null;
    matchConfidence: number | null;
  };
  assessment: {
    id: string;
    appLiabilityUser: number;
    appLiabilityOther: number;
    najmLiabilityUser: number | null;
    najmLiabilityOther: number | null;
    liabilityDifference: number | null;
    userDescription: string | null;
    assessedAt: string;
  } | null;
  falseAlarm: {
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
  } | null;
  matched: {
    id: string;
    accidentAId: string;
    accidentBId: string;
    consistencyStatus: string;
    liabilityAPercent: number;
    liabilityBPercent: number;
    firstContactParty: string;
  } | null;
  partner: {
    id: string;
    deviceId: string;
    timestamp: string;
    severity: string;
    impactZone: string;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
