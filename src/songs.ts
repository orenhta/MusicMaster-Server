export type Song = {
  title: string;
  artist: string;
  duration: number;
};

export const songsById: Record<number, Song> = {
  1: {
    title: "Africa",
    artist: "Toto",
    duration: 24,
  },
  2: {
    title: "Sweet Home Alabama",
    artist: "Lynyrd Skynyrd",
    duration: 20,
  },
  3: {
    title: "Viva La Vida",
    artist: "Coldplay",
    duration: 30,
  },
  4: {
    title: "Whenever, Wherever",
    artist: "Shakira",
    duration: 30,
  },
  5: {
    title: "Wonderwall",
    artist: "Oasis",
    duration: 20,
  },
};
