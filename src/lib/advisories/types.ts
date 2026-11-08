export type AdvisoryLevel = 1 | 2 | 3 | 4;

export interface EmergencyContacts {
  police: string;
  ambulance: string;
  fire: string;
  tourist_helpline?: string;
  consular_emergency?: string;
}

export interface ConsularAdvisory {
  country_code: string;
  country_name: string;
  level: AdvisoryLevel;
  level_name: string;
  badge_color: string;
  summary: string;
  emergency_contacts: EmergencyContacts;
  entry_requirements: {
    passport_validity_months: number;
    visa_free_tourism_days?: number;
    schengen_zone?: boolean;
    mandatory_insurance?: boolean;
  };
  safety_score: number; // 0-100 (higher is safer)
  source: string;
  last_verified: string;
}
