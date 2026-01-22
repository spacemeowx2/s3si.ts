export type Season = {
  id: string;
  name: string;
  start: Date;
  end: Date;
};

const SEASON_PREFIXES = [
  "Chill",
  "Fresh",
  "Sizzle",
  "Drizzle",
];

export const getSeason = (date: Date): Season | undefined => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const season = Math.floor((month + 1) % 12 / 3);

  const startYear = season === 0 && month < 2 ? year - 1 : year;
  const endYear = season === 0 ? year + 1 : year;

  if (startYear < 2022 || (endYear === 2022 && season !== 3)) {
    return undefined;
  }

  const startMonth = (season * 3 - 1 + 12) % 12;
  const endMonth = (season * 3 + 2 + 12) % 12;

  const start = new Date(Date.UTC(startYear, startMonth));
  const end = new Date(Date.UTC(endYear, endMonth));

  const monthId = (startMonth + 1).toString().padStart(2, "0");
  const id = `season${startYear}${monthId}`;

  const prefix = SEASON_PREFIXES[season];
  const name = `${prefix} Season ${startYear}`;

  return {
    id,
    name,
    start,
    end,
  };
};
