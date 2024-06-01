export type Season = {
  id: string;
  name: string;
  start: Date;
  end: Date;
};

export const SEASONS: Season[] = [
  {
    id: "season202209",
    name: "Drizzle Season 2022",
    start: new Date("2022-09-01T00:00:00+00:00"),
    end: new Date("2022-12-01T00:00:00+00:00"),
  },
  {
    id: "season202212",
    name: "Chill Season 2022",
    start: new Date("2022-12-01T00:00:00+00:00"),
    end: new Date("2023-03-01T00:00:00+00:00"),
  },
  {
    id: "season202303",
    name: "Fresh Season 2023",
    start: new Date("2023-03-01T00:00:00+00:00"),
    end: new Date("2023-06-01T00:00:00+00:00"),
  },
  {
    id: "season202306",
    name: "Sizzle Season 2023",
    start: new Date("2023-06-01T00:00:00+00:00"),
    end: new Date("2023-09-01T00:00:00+00:00"),
  },
  {
    id: "season202309",
    name: "Drizzle Season 2023",
    start: new Date("2023-09-01T00:00:00+00:00"),
    end: new Date("2023-12-01T00:00:00+00:00"),
  },
  {
    id: "season202312",
    name: "Chill Season 2023",
    start: new Date("2023-12-01T00:00:00+00:00"),
    end: new Date("2024-03-01T00:00:00+00:00"),
  },
  {
    id: "season202403",
    name: "Fresh Season 2024",
    start: new Date("2024-03-01T00:00:00+00:00"),
    end: new Date("2024-06-01T00:00:00+00:00"),
  },
  {
    id: "season202406",
    name: "Sizzle Season 2024",
    start: new Date("2024-06-01T00:00:00+00:00"),
    end: new Date("2024-09-01T00:00:00+00:00"),
  },
  {
    id: "season202409",
    name: "Drizzle Season 2024",
    start: new Date("2024-09-01T00:00:00+00:00"),
    end: new Date("2024-12-01T00:00:00+00:00"),
  },
  {
    id: "season202412",
    name: "Chill Season 2024",
    start: new Date("2024-12-01T00:00:00+00:00"),
    end: new Date("2025-03-01T00:00:00+00:00"),
  },
  {
    id: "season202503",
    name: "Fresh Season 2025",
    start: new Date("2025-03-01T00:00:00+00:00"),
    end: new Date("2025-06-01T00:00:00+00:00"),
  },
  {
    id: "season202506",
    name: "Sizzle Season 2025",
    start: new Date("2025-06-01T00:00:00+00:00"),
    end: new Date("2025-09-01T00:00:00+00:00"),
  },
  {
    id: "season202509",
    name: "Drizzle Season 2025",
    start: new Date("2025-09-01T00:00:00+00:00"),
    end: new Date("2025-12-01T00:00:00+00:00"),
  },
  {
    id: "season202512",
    name: "Chill Season 2025",
    start: new Date("2025-12-01T00:00:00+00:00"),
    end: new Date("2026-03-01T00:00:00+00:00"),
  },
];

export const getSeason = (date: Date): Season | undefined => {
  return SEASONS.find((s) => s.start <= date && date < s.end);
};
