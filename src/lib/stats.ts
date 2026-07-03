import type { BmiStatus, PeriodChange, PersonProfile, PersonSummary, WeightRecord } from "../types";

const dayMs = 86_400_000;
export type ChartMetric = "weight" | "changePct" | "bmi";

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBmiStatus(bmi: number): BmiStatus {
  if (bmi < 18.5) return "偏瘦";
  if (bmi < 24) return "正常";
  if (bmi < 28) return "超重";
  return "肥胖";
}

export function percentChange(current: number, baseline: number) {
  return ((current - baseline) / baseline) * 100;
}

export function getMetricValue(person: PersonProfile, record: WeightRecord, metric: ChartMetric) {
  if (metric === "weight") {
    return round(record.weightKg);
  }
  if (metric === "changePct") {
    return round(percentChange(record.weightKg, person.records[0].weightKg), 2);
  }
  return round(calculateBmi(record.weightKg, person.heightCm), 2);
}

function subtractMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() - months);
  return next;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function findBaseline(records: WeightRecord[], target: Date) {
  let baseline: WeightRecord | null = null;
  for (const record of records) {
    if (toDate(record.date).getTime() <= target.getTime()) {
      baseline = record;
    } else {
      break;
    }
  }
  return baseline;
}

function getPeriodChange(records: WeightRecord[], latest: WeightRecord, months: number): PeriodChange | null {
  const targetDate = subtractMonths(toDate(latest.date), months);
  const earliest = toDate(records[0].date);

  if (targetDate.getTime() < earliest.getTime() - dayMs) {
    return null;
  }

  const baseline = findBaseline(records, targetDate);
  if (!baseline || baseline.date === latest.date) {
    return null;
  }

  const kg = latest.weightKg - baseline.weightKg;
  return {
    baselineDate: baseline.date,
    kg,
    pct: percentChange(latest.weightKg, baseline.weightKg),
  };
}

export function summarizePerson(person: PersonProfile): PersonSummary {
  const records = person.records;
  const first = records[0];
  const latest = records[records.length - 1];
  const bmi = calculateBmi(latest.weightKg, person.heightCm);

  return {
    person,
    first,
    latest,
    bmi,
    bmiStatus: getBmiStatus(bmi),
    changeFromStartKg: latest.weightKg - first.weightKg,
    changeFromStartPct: percentChange(latest.weightKg, first.weightKg),
    oneMonthChange: getPeriodChange(records, latest, 1),
    threeMonthChange: getPeriodChange(records, latest, 3),
  };
}

export function buildChartRows(rangePeople: PersonProfile[], visiblePeople: PersonProfile[], metric: ChartMetric) {
  const allDates = rangePeople.flatMap((person) => person.records.map((record) => record.date)).sort();
  const firstDate = allDates[0];
  const lastDate = allDates[allDates.length - 1];

  if (!firstDate || !lastDate) {
    return [];
  }

  const rows: Record<string, number | string | null>[] = [];
  for (let cursor = toDate(firstDate); cursor.getTime() <= toDate(lastDate).getTime(); cursor = addDays(cursor, 1)) {
    const date = toDateString(cursor);
    const row: Record<string, number | string | null> = { date };

    for (const person of visiblePeople) {
      let latestRecord: WeightRecord | null = null;
      for (const record of person.records) {
        if (record.date > date) {
          break;
        }
        latestRecord = record;
      }

      row[person.id] = latestRecord ? getMetricValue(person, latestRecord, metric) : null;
    }

    rows.push(row);
  }

  return rows;
}
