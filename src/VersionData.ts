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
];

export const getSeason = (date: Date): Season | undefined => {
  return SEASONS.find((s) => s.start <= date && date < s.end);
};
