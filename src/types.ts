export type WeightRecord = {
  date: string;
  weightKg: number;
};

export type PersonProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  heightCm: number;
  records: WeightRecord[];
};

export type BmiStatus = "偏瘦" | "正常" | "超重" | "肥胖";

export type PersonSummary = {
  person: PersonProfile;
  latest: WeightRecord;
  first: WeightRecord;
  bmi: number;
  bmiStatus: BmiStatus;
  changeFromStartKg: number;
  changeFromStartPct: number;
  oneMonthChange: PeriodChange | null;
  threeMonthChange: PeriodChange | null;
};

export type PeriodChange = {
  baselineDate: string;
  kg: number;
  pct: number;
};
