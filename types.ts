export enum Role {
  AMBULANCE = "AMBULANCE",
  HOSPITAL = "HOSPITAL",
  POLICE = "POLICE",
}

export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  CRITICAL = "CRITICAL",
}

export type ConditionState =
  | "STABLE"
  | "CRITICAL"
  | "UNCONSCIOUS"
  | "SEMI-CONSCIOUS"
  | "";

export interface PatientIdentity {
  name?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  relationship?: string;
  idSource?: string;
  temporaryId?: string;

  // Police Verified Details
  age?: string;
  gender?: string;
  address?: string;
  govIdType?: string;
  govIdNumber?: string;
  vehicleNumber?: string;
  caseReference?: string;
  isPoliceVerified?: boolean;
}

export interface MedicalCondition {
  state: ConditionState;
  injuries: string;
  symptoms: string;
  treatment: string;
  lastUpdatedByEMS?: string;
  medicalSentToHospital?: boolean;
}

export interface AccidentDetails {
  accidentLocation: string;
  hospitalLocation: string;
  identitySentToPolice?: boolean;
}

export interface ReadinessStatus {
  icu: boolean;
  blood: boolean;
  specialist: boolean;
  equipment: boolean;
  medicines: boolean;
}

export interface Evidence {
  patientPhoto?: string;
  vehiclePhoto?: string;
  scenePhoto?: string;
}

export interface InjuryEvidence {
  injuryImage?: File | null;
}

export interface OfficialAuthorization {
  officerName: string;
  badgeId: string;
  stationName: string;
  authorizationStatus: "Verified" | "Pending" | "Rejected";
  remarks: string;
}

export interface EmergencyCase {
  id: string;
  ambulanceId: string;
  hospitalId: string;
  identity: PatientIdentity;
  isUnknown: boolean;
  severity: Severity;
  vitals: Vitals;
  medicalCondition: MedicalCondition;
  accidentDetails: AccidentDetails;
  eta: number;
  status: "TRANSIT" | "ARRIVED";
  geminiSummary?: string;
  /** Set when pulse is explicitly reported as 0 (voice or manual). */
  cardiacArrestAlert?: boolean;
  description?: string;
  evidence: Evidence;
  injuryEvidence?: InjuryEvidence;
  officialAuthorization?: OfficialAuthorization;
  readiness: ReadinessStatus;
  createdAt: string;
}

export interface Vitals {
  pulse: number;
  bp_sys: number;
  bp_dia: number;
  spo2: number;
  temp: number;
  lastUpdated: string;
}

export interface AdmissionRecord {
  date: string;
  condition: string;
  doctor: string;
  outcome: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  name: string;
}
