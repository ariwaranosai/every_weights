import type { PersonProfile } from "../types";

const modules = import.meta.glob<PersonProfile>("../data/people/*.json", {
  eager: true,
  import: "default",
});

export const people = Object.values(modules)
  .map((person) => ({
    ...person,
    records: [...person.records].sort((a, b) => a.date.localeCompare(b.date)),
  }))
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
