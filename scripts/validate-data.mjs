import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const dataDir = path.resolve("src/data/people");
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const ids = new Set();
const errors = [];
const warnings = [];

function parseDate(value, owner, index) {
  if (typeof value !== "string" || !datePattern.test(value)) {
    errors.push(`${owner}: records[${index}].date must be YYYY-MM-DD`);
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    errors.push(`${owner}: records[${index}].date is not a valid date`);
    return null;
  }
  return date;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const files = (await readdir(dataDir)).filter((file) => file.endsWith(".json")).sort();

if (files.length === 0) {
  errors.push("src/data/people must contain at least one .json file");
}

for (const file of files) {
  const fullPath = path.join(dataDir, file);
  let person;

  try {
    person = JSON.parse(await readFile(fullPath, "utf8"));
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }

  const owner = person?.id ?? file;

  if (typeof person?.id !== "string" || !/^[a-z0-9-]+$/.test(person.id)) {
    errors.push(`${file}: id must use lowercase letters, numbers, and hyphens`);
  } else if (ids.has(person.id)) {
    errors.push(`${file}: duplicate id "${person.id}"`);
  } else {
    ids.add(person.id);
  }

  if (typeof person?.displayName !== "string" || person.displayName.trim() === "") {
    errors.push(`${owner}: displayName is required`);
  }

  if (person?.avatarUrl !== undefined && (typeof person.avatarUrl !== "string" || person.avatarUrl.trim() === "")) {
    errors.push(`${owner}: avatarUrl must be a non-empty string when present`);
  }

  if (!isPositiveNumber(person?.heightCm)) {
    errors.push(`${owner}: heightCm must be a positive number`);
  }

  if (!Array.isArray(person?.records) || person.records.length === 0) {
    errors.push(`${owner}: records must contain at least one entry`);
    continue;
  }

  let previousDate = null;
  for (let index = 0; index < person.records.length; index += 1) {
    const record = person.records[index];
    const currentDate = parseDate(record?.date, owner, index);

    if (!isPositiveNumber(record?.weightKg)) {
      errors.push(`${owner}: records[${index}].weightKg must be a positive number`);
    }

    if (previousDate && currentDate) {
      const days = Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000);
      if (days <= 0) {
        errors.push(`${owner}: records must be sorted by ascending date`);
      } else if (Math.abs(days - 3) > 1) {
        warnings.push(`${owner}: ${record.date} is ${days} days after previous record, expected about 3 days`);
      }
    }

    previousDate = currentDate ?? previousDate;
  }
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`Error: ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${files.length} people files with ${warnings.length} warning(s).`);
