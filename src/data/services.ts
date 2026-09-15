export type Service = {
  id: string;
  name: string;
  url: string;
  category: "video" | "live" | "music" | "de" | "sport";
  accent: string;
  blurb: string;
};

export const services: Service[] = [
  { id: "netflix", name: "Netflix", url: "https://www.netflix.com", category: "video", accent: "#e50914", blurb: "Serien & Filme" },
  { id: "youtube-tv", name: "YouTube TV", url: "https://www.youtube.com/tv", category: "video", accent: "#ff0033", blurb: "TV-Oberfläche" },
  { id: "disney", name: "Disney+", url: "https://www.disneyplus.com", category: "video", accent: "#113ccf", blurb: "Disney, Marvel, Star" },
  { id: "prime", name: "Prime Video", url: "https://www.primevideo.com", category: "video", accent: "#00a8e1", blurb: "Amazon Originals" },
  { id: "appletv", name: "Apple TV", url: "https://tv.apple.com", category: "video", accent: "#8e8e93", blurb: "Apple Originals" },
  { id: "max", name: "Max", url: "https://www.max.com", category: "video", accent: "#002be7", blurb: "HBO & mehr" },
  { id: "paramount", name: "Paramount+", url: "https://www.paramountplus.com", category: "video", accent: "#0064ff", blurb: "Shows & Filme" },
  { id: "crunchyroll", name: "Crunchyroll", url: "https://www.crunchyroll.com", category: "video", accent: "#f47521", blurb: "Anime" },
  { id: "twitch", name: "Twitch", url: "https://www.twitch.tv", category: "live", accent: "#9146ff", blurb: "Live Streams" },
  { id: "tiktok", name: "TikTok", url: "https://www.tiktok.com", category: "live", accent: "#25f4ee", blurb: "Shorts" },
  { id: "pluto", name: "Pluto TV", url: "https://pluto.tv", category: "live", accent: "#fff200", blurb: "Gratis Live-TV" },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", category: "music", accent: "#1db954", blurb: "Musik & Podcasts" },
  { id: "ytmusic", name: "YouTube Music", url: "https://music.youtube.com", category: "music", accent: "#ff0000", blurb: "Musik" },
  { id: "ard", name: "ARD", url: "https://www.ardmediathek.de", category: "de", accent: "#003d7a", blurb: "Mediathek" },
  { id: "zdf", name: "ZDF", url: "https://www.zdf.de", category: "de", accent: "#fa7d19", blurb: "Mediathek" },
  { id: "joyn", name: "Joyn", url: "https://www.joyn.de", category: "de", accent: "#0a84ff", blurb: "Live & Mediathek" },
  { id: "rtl", name: "RTL+", url: "https://plus.rtl.de", category: "de", accent: "#e1000f", blurb: "Shows & Sport" },
  { id: "wow", name: "WOW", url: "https://www.wowtv.de", category: "de", accent: "#6c2bd9", blurb: "Sky Inhalte" },
  { id: "dazn", name: "DAZN", url: "https://www.dazn.com", category: "sport", accent: "#0c2340", blurb: "Live Sport" },
];

export const serviceCategories: { id: Service["category"]; label: string }[] = [
  { id: "video", label: "Streamer" },
  { id: "de", label: "Deutschland" },
  { id: "live", label: "Live & Shorts" },
  { id: "sport", label: "Sport" },
  { id: "music", label: "Musik" },
];
