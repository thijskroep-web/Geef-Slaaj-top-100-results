import { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
import LanguagePieChart from "../components/LanguagePieChart";


/* ================= TYPES ================= */

type ResultSong = {
  id: number;
  title: string;
  artist: string;
  points: number;
  appearances: number;
  Releasedatum?: string | null;
  duration_ms?: string | null;
  explicit?: boolean | null;
  language?: string | null;
  country_artist?: string | null;
};

type IndividualList = {
  name: string;
  selections: {
    id: number;
    rank: number;
    title: string;
    artist: string;
  }[];
};

type Props = {
  justMissed: ResultSong[];
  results: ResultSong[];
  top100: ResultSong[];
  individualLists?: IndividualList[];
};

type YearStat = {
  year: number;
  count: number;
};

type ArtistStat = {
  artist: string;
  points: number;
  songs: number;
  votes: number;
};

type TopNStat = {
  id: number;
  title: string;
  artist: string;
  count: number;
};


type AvgPointStat = {
  id: number;
  title: string;
  artist: string;
  avgPoints: number;
  appearances: number;
};

type View =
  | null
  | "justMissed"
  | "top10"
  | "artists"
  | "languages"
  | "years"
  | "avgPoints"
  | "individualLists"
  | "playlist"
  | "general";

/* ================= HELPERS ================= */

function extractYear(Releasedatum?: string | null): number | null {
  if (!Releasedatum) return null;
  if (/^\d{4}$/.test(Releasedatum)) return Number(Releasedatum);
  if (Releasedatum.includes("-")) {
    const parts = Releasedatum.split("-");
    const year = Number(parts[parts.length - 1]);
    return isNaN(year) ? null : year;
  }
  return null;
}

function buildYearStats(songs: ResultSong[]): YearStat[] {
  const map: Record<number, number> = {};
  songs.forEach((song) => {
    const year = extractYear(song.Releasedatum);
    if (!year) return;
    map[year] = (map[year] || 0) + 1;
  });
  return Object.entries(map)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year);
}

function buildArtistStats(songs: ResultSong[]): ArtistStat[] {
  const map: Record<string, ArtistStat> = {};

  songs.forEach((song) => {
    const artists = song.artist
      .split(",")
      .map((a) => a.trim());

    artists.forEach((artist) => {
      if (!map[artist]) {
        map[artist] = {
          artist,
          points: 0,
          songs: 0,
          votes: 0,
        };
      }

      map[artist].points += song.points;
      map[artist].songs += 1;
      map[artist].votes += song.appearances; // 👈 stemmen optellen
    });
  });

  return Object.values(map).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.artist.localeCompare(b.artist);
  });
}

function getOldestAndYoungest(songs: ResultSong[]) {
  const withYear = songs
    .map((s) => ({
      ...s,
      year: extractYear(s.Releasedatum),
    }))
    .filter((s) => s.year !== null) as (ResultSong & { year: number })[];

  if (!withYear.length) return null;

  const sorted = [...withYear].sort((a, b) => a.year - b.year);

  return {
    oldest: sorted[0],
    youngest: sorted[sorted.length - 1],
  };
}

function calculateOverlapStats(
  top100: ResultSong[],
  individualLists: IndividualList[]
) {
  const top100Ids = new Set(top100.map((s) => s.id));

  const overlaps = individualLists.map((list) => {
    const matches = list.selections.filter((s) =>
      top100Ids.has(s.id)
    ).length;

    const percentage =
      list.selections.length > 0
        ? (matches / list.selections.length) * 100
        : 0;

    return {
      name: list.name,
      percentage,
    };
  });

  if (!overlaps.length) return null;

  const sorted = [...overlaps].sort(
    (a, b) => b.percentage - a.percentage
  );

  return {
    most: sorted[0],
    least: sorted[sorted.length - 1],
  };
}  

type VoteDistribution = {
  votes: number;
  count: number;
};

function buildVoteDistribution(songs: ResultSong[]): VoteDistribution[] {
  const map: Record<number, number> = {};

  songs.forEach((song) => {
    if (song.appearances > 0) {
      map[song.appearances] =
        (map[song.appearances] || 0) + 1;
    }
  });

  return Object.entries(map)
    .map(([votes, count]) => ({
      votes: Number(votes),
      count,
    }))
    .sort((a, b) => a.votes - b.votes);
}

type CountryStat = {
  country: string;
  count: number;
};

function buildCountryStats(songs: ResultSong[]): CountryStat[] {
  const map: Record<string, number> = {};

  songs.forEach((s) => {
    if (!s.country_artist) return;

    const countries = s.country_artist
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    countries.forEach((country) => {
      map[country] = (map[country] || 0) + 1;
    });
  });

  return Object.entries(map)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

type LanguageStat = {
  language: string;
  count: number;
};

function buildLanguageStats(songs: ResultSong[]): LanguageStat[] {
  const map: Record<string, number> = {};

  songs.forEach((s) => {
    if (!s.language) return;
    map[s.language] = (map[s.language] || 0) + 1;
  });

  return Object.entries(map)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
}

function buildFriendLanguageStats(
  friend: IndividualList,
  songs: ResultSong[]
) {
  const songMap = new Map(songs.map((s) => [s.id, s.language]));
  const map: Record<string, number> = {};

  friend.selections.forEach((sel) => {
    const lang = songMap.get(sel.id);
    if (!lang) return;
    map[lang] = (map[lang] || 0) + 1;
  });

  return Object.entries(map)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // podium
}

function getLongestAndShortest(songs: ResultSong[]) {
  const withDuration = songs
    .map((s) => ({
      ...s,
      duration: s.duration_ms ? Number(s.duration_ms) : null,
    }))
    .filter((s) => s.duration !== null) as (ResultSong & { duration: number })[];

  if (!withDuration.length) return null;

  const sorted = [...withDuration].sort((a, b) => a.duration - b.duration);

  return {
    shortest: sorted[0],
    longest: sorted[sorted.length - 1],
  };
}

function getAverageDuration(songs: ResultSong[]): number | null {
  const durations = songs
    .map((s) => s.duration_ms ? Number(s.duration_ms) : null)
    .filter((d): d is number => d !== null);

  if (!durations.length) return null;

  const total = durations.reduce((sum, d) => sum + d, 0);
  return total / durations.length;
}

function getExplicitPercentage(songs: ResultSong[]): number {
  const valid = songs.filter((s) => s.explicit !== null);
  const explicitCount = valid.filter((s) => s.explicit === true).length;

  return valid.length > 0 ? (explicitCount / valid.length) * 100 : 0;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}


const COUNTRY_CODE_MAP: Record<string, string> = {
  Nederland: "NL",
  Duitsland: "DE",
  "Verenigde Staten": "US",
  Italië: "IT",
  Zweden: "SE",
  Frankrijk: "FR",
  "Verenigd Koninkrijk": "GB",
  "Puerto Rico": "PR",
  Japan: "JP",
  België: "BE",
  Noorwegen: "NO",
  Spanje: "ES",
  Filipijnen: "PH",
  Jamaica: "JM",
  Ierland: "IE",
  Portugal: "PT"
};

function countryToFlagImg(code: string) {
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}

const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  Nederlands: "NL",
  Engels: "GB",
  Duits: "DE",
  Frans: "FR",
  Spaans: "ES",
  Italiaans: "IT",
  Zweeds: "SE",
  Japans: "JP",
  Portugees: "PT",
};

function languageToFlagImg(language: string) {
  const code = LANGUAGE_COUNTRY_MAP[language];
  if (!code) return null;
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}



/* ================= COMPONENT ================= */

export default function Statistics({ justMissed, results, top100, individualLists = [] }: Props) {
  const [activeView, setActiveView] = useState<View>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  console.log("TOP100 SAMPLE", top100.slice(0, 3));

  /* ===== MEMO STATS ===== */
  const yearStats = useMemo(() => buildYearStats(top100), [top100]);
  const artistStats = useMemo(() => buildArtistStats(results), [results]);

  
  const avgPointStats = useMemo<AvgPointStat[]>(() => {
    return top100
      .filter((s) => s.appearances > 0)
      .map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        avgPoints: s.points / s.appearances,
        appearances: s.appearances,
      }))
      .sort((a, b) => b.avgPoints - a.avgPoints);
  }, [top100]);

  const totalVotes = useMemo(
    () => results.reduce((sum, s) => sum + s.appearances, 0),
    [results]
  );
  
  const uniqueSongsVoted = useMemo(
    () => results.filter((s) => s.appearances > 0).length,
    [results]
  );
  
  const ageStats = useMemo(
    () => getOldestAndYoungest(top100),
    [top100]
  );
  
  const durationStats = useMemo(
    () => getLongestAndShortest(top100), 
    [top100]
  );
  
  const averageDuration = useMemo(
    () => getAverageDuration(top100), 
    [top100]
  );

  const explicitPercentage = useMemo(
    () => getExplicitPercentage(top100), 
    [top100]
  );
  
  const overlapStats = useMemo(
    () => calculateOverlapStats(top100, individualLists),
    [top100, individualLists]
  );  

  const voteDistribution = useMemo(
    () => buildVoteDistribution(results),
    [results]
  );
  
  const countryStats = useMemo(
    () => buildCountryStats(top100),
    [top100]
  );
  
  const languageStats = useMemo(
    () => buildLanguageStats(top100),
    [top100]
  );
  
  const friendLanguagePodium = useMemo(() => {
    if (!selectedPerson) return null;
    const friend = individualLists.find(
      (l) => l.name === selectedPerson
    );
    if (!friend) return null;
    return buildFriendLanguageStats(friend, results);
  }, [selectedPerson, individualLists, results]);
  
  /* ===== TOP 10 STATS ===== */
  const [topNStats, setTopNStats] = useState<TopNStat[]>([]);
  const [loadingTop10, setLoadingTop10] = useState(false);
  const [topLimitInput, setTopLimitInput] = useState("10");
  const topLimit = Number(topLimitInput || 10);




  useEffect(() => {
    if (activeView === "top10" && !Number.isNaN(topLimit) && topLimit > 0) {
      loadTopNStats(topLimit);
    }
  }, [topLimit, activeView]);  


  async function loadTopNStats(topLimit: number) {
    setLoadingTop10(true);
  
    const { data: votes } = await supabase
      .from("votes")
      .select("selections");
  
    if (!votes) {
      setLoadingTop10(false);
      return;
    }

    const countMap: Record<number, number> = {};
    votes.forEach((vote) => {
      vote.selections?.forEach((sel: any) => {
        if (sel.rank <= topLimit) countMap[sel.id] = (countMap[sel.id] || 0) + 1;
      });
    });

    const songIds = Object.keys(countMap).map(Number);
    const { data: songs } = await supabase
      .from("songs")
      .select("id, title, artist")
      .in("id", songIds);

    if (!songs) {
      setLoadingTop10(false);
      return;
    }

    const combined = songs
    .map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      count: countMap[s.id] ?? 0,
    }))  
      .sort((a, b) => b.count - a.count);

    setTopNStats(combined);
    setLoadingTop10(false);
  }

  /* ================= RENDER ================= */

  return (
    <div className="statistics">
      <h2>📊 Statistieken</h2>

      {!activeView && (
        <div className="stats-menu">
          <button onClick={() => setActiveView("general")}>📈 Algemene statistieken</button>
          <button onClick={() => setActiveView("justMissed")}>😢 Net buiten de Top 100</button>
          <button onClick={() => {setActiveView("top10");loadTopNStats(topLimit);}}>🔢 Vaakst in Top {topLimit}</button>
          <button onClick={() => setActiveView("languages")}>🌍 Talen & Landen</button>
          <button onClick={() => setActiveView("artists")}>🎤 Artiesten met meeste punten</button>
          <button onClick={() => setActiveView("years")}>📆 Releases per jaartal</button>
          <button onClick={() => setActiveView("avgPoints")}>🎯 Gemiddelde punten per stem</button>
          <button onClick={() => setActiveView("individualLists")}>🙋‍♂️ Individuele lijstjes</button>
          <button onClick={() => setActiveView("playlist")}>🎵 Geef Slaaj Playlist</button>
        </div>
      )}

      {/* 😢 JUST MISSED */}
      {activeView === "justMissed" && (
        <>
          <button className="stats-back" onClick={() => setActiveView(null)}>← Terug</button>
          <section className="stat-block">
            <h3>😢 Net buiten de Top 100</h3>
            {justMissed.map((song, i) => (
              <div key={song.id} className="stat-row">
                <strong>{101 + i}.</strong> {song.title} – {song.artist}
                <div className="stat-meta">⭐ {song.points} punten • 🗳️ {song.appearances} stemmen</div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* 🔟 TOP 10 */}
      {activeView === "top10" && (
        <>
          <button
            className="stats-back"
            onClick={() => setActiveView(null)}
          >
            ← Terug
          </button>

          <section className="stat-block">
            <h3>🔢 Vaakst in Top {topLimit}</h3>

            <div style={{ marginBottom: "1rem" }}>
              <label>
                Toon Top&nbsp;
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={topLimitInput}
                  onChange={(e) =>
                    setTopLimitInput(e.target.value)
                  }
                  style={{ width: "60px", marginLeft: "6px" }}
                />
              </label>
            </div>

            {loadingTop10 && <p>Laden…</p>}

            {!loadingTop10 &&
              topNStats.map((song, i) => (
                <div key={song.id} className="stat-row">
                  <strong>{i + 1}.</strong> {song.title} –{" "}
                  {song.artist}
                  <div className="stat-meta">
                    🔢 {song.count}× in Top {topLimit}
                  </div>
                </div>
              ))}
          </section>
        </>
      )}


      {/* 🎤 ARTISTS */}
      {activeView === "artists" && (
        <>
          <button className="stats-back" onClick={() => setActiveView(null)}>← Terug</button>
          <section className="stat-block">
            <h3>🎤 Artiesten met meeste punten</h3>
            <h4>Gebaseerd op alle stemmen</h4>
            {artistStats.map((artist, i) => (
              <div key={artist.artist} className="stat-row">
                <strong>{i + 1}.</strong> {artist.artist}
                <div className="stat-meta">⭐ {artist.points} punten • 🗳️ {artist.votes} stemmen • 🎵 {artist.songs} nummers</div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* 📆 YEARS */}
      {activeView === "years" && (
        <>
          <button className="stats-back" onClick={() => setActiveView(null)}>← Terug</button>
          <section className="stat-block">
            <h3>📆 Aantal nummers per jaartal</h3>
            <div className="year-chart">
              {yearStats.map(({ year, count }) => (
                <div key={year} className="year-row">
                  <span className="year-label">{year}</span>
                  <div className="year-bar-wrapper">
                    <div className="year-bar" style={{ width: `${count * 26}px` }} />
                  </div>
                  <span className="year-count">{count}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 🎯 AVG POINTS */}
      {activeView === "avgPoints" && (
        <>
          <button className="stats-back" onClick={() => setActiveView(null)}>← Terug</button>
          <section className="stat-block">
            <h3>🎯 Gemiddelde punten per stem</h3>
            {avgPointStats.map((song, i) => (
              <div key={song.id} className="stat-row">
                <strong>{i + 1}.</strong> {song.title} – {song.artist}
                <div className="stat-meta">
                  🎯 {song.avgPoints.toFixed(1)} gemiddeld • 🗳️ {song.appearances} stemmen
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* 🙋‍♂️ INDIVIDUAL LISTS */}
      {activeView === "individualLists" && (
        <>
          <button className="stats-back" onClick={() => { setActiveView(null); setSelectedPerson(null); }}>← Terug</button>
          <section className="stat-block">
            <h3>🙋‍♂️ Lijstje van {selectedPerson}</h3>
            {!selectedPerson ? (
              <div className="stats-menu">
                {(!individualLists || individualLists.length === 0) && <p>Geen stemgegevens beschikbaar</p>}
                {individualLists?.map((list) => (
                  <button key={list.name} onClick={() => setSelectedPerson(list.name)}>{list.name}</button>
                ))}
              </div>
            ) : (
              <>
                <button className="stats-back" onClick={() => setSelectedPerson(null)}>← Kies andere naam</button>
                {individualLists
                  ?.find((l) => l.name === selectedPerson)
                  ?.selections.map((song) => (
                    <div key={song.id} className="individual-row">
                      <div className="individual-rank">{song.rank}.</div>

                      <div className="individual-text">
                        <div className="individual-title">{song.title}</div>
                        <div className="individual-artist">{song.artist}</div>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </section>
        </>
      )}

      {/* 🎵 PLAYLIST */}
      {activeView === "playlist" && (
        <>
          <button
            className="stats-back"
            onClick={() => setActiveView(null)}
          >
            ← Terug
          </button>

          <section className="stat-block">
            <div style={{ marginTop: "0px" }}>
              <iframe
                style={{ borderRadius: "12px" }}
                src="https://open.spotify.com/embed/playlist/6QCZMZtOsn83tUpfQpAzrz?utm_source=generator"
                width="100%"
                height="443"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          </section>
        </>
      )}

      {/* 📈 GENERAL STATS */}
      {activeView === "general" && (
        <>
          <button
            className="stats-back"
            onClick={() => setActiveView(null)}
          >
            ← Terug
          </button>

          <section className="stat-block">
            <h3>📈 Algemene statistieken</h3>

            <div className="stats-dashboard">
              <div className="stat-tile">
                <span className="stat-title">Totaal aantal stemmen</span>
                <span className="stat-icon">🗳️</span>
                <span className="stat-value">{totalVotes}</span>
              </div>

              <div className="stat-tile">
                <span className="stat-title">Unieke nummers</span>
                <span className="stat-icon">🎵</span>
                <span className="stat-value">{uniqueSongsVoted}</span>
              </div>

              {ageStats && (
                <>
                  <div className="stat-tile">
                    <span className="stat-title">Oudste nummer</span>
                    <span className="stat-icon">🕰️</span>
                    <span className="stat-value">
                      {extractYear(ageStats.oldest.Releasedatum)}
                    </span>
                    <span className="stat-sub">
                      {ageStats.oldest.title}
                    </span>
                  </div>

                  <div className="stat-tile">
                    <span className="stat-title">Jongste nummer</span>
                    <span className="stat-icon">🆕</span>
                    <span className="stat-value">
                      {extractYear(ageStats.youngest.Releasedatum)}
                    </span>
                    <span className="stat-sub">
                      {ageStats.youngest.title}
                    </span>
                  </div>
                </>
              )}

              {durationStats && (
                <>
                  <div className="stat-tile">
                    <span className="stat-title">Langste nummer</span>
                    <span className="stat-icon">⏱️</span>
                    <span className="stat-value">
                    {formatDuration(Number(durationStats.longest.duration_ms))}
                    </span>
                    <span className="stat-sub">
                      {durationStats.longest.title}
                    </span>
                  </div>

                  <div className="stat-tile">
                    <span className="stat-title">Kortste nummer</span>
                    <span className="stat-icon">⚡</span>
                    <span className="stat-value">
                    {formatDuration(Number(durationStats.shortest.duration_ms))}
                    </span>
                    <span className="stat-sub">
                      {durationStats.shortest.title}
                    </span>
                  </div>
                </>
              )}

              <div className="stat-tile">
                <span className="stat-title">Gemiddelde duur</span>
                <span className="stat-icon">📏</span>
                <span className="stat-value">
                {averageDuration ? formatDuration(averageDuration) : "?"}
                </span>
              </div>

              <div className="stat-tile">
                <span className="stat-title">% Explicit</span>
                <span className="stat-icon">🤬</span>
                <span className="stat-value">
                  {explicitPercentage.toFixed(0)}%
                </span>
              </div>

              {overlapStats && (
                <>
                  <div className="stat-tile">
                    <span className="stat-title">Meeste overlap</span>
                    <span className="stat-icon">🤝</span>
                    <span className="stat-value">
                      {overlapStats.most.percentage.toFixed(0)}%
                    </span>
                    <span className="stat-sub">
                      {overlapStats.most.name}
                    </span>
                  </div>

                  <div className="stat-tile">
                    <span className="stat-title">Minste overlap</span>
                    <span className="stat-icon">🙃</span>
                    <span className="stat-value">
                      {overlapStats.least.percentage.toFixed(0)}%
                    </span>
                    <span className="stat-sub">
                      {overlapStats.least.name}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="stat-tile">
              <span className="stat-title">📊 Stemverdeling per nummer</span>
              <div className="year-chart">
                {voteDistribution.map(({ votes, count }) => (
                  <div key={votes} className="year-row">
                    <span className="year-label">
                      {votes}×
                    </span>

                    <div className="year-bar-wrapper">
                      <div
                        className="year-bar"
                        style={{ width: `${count * 1.4}px` }}
                      />
                    </div>

                    <span className="year-count">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
             </div>
          </section>
        </>
      )}
      {/* 🌍 Languages */}
      {activeView === "languages" && (
        <>
          <button
            className="stats-back"
            onClick={() => setActiveView(null)}
          >
            ← Terug
          </button>

          <section className="stat-block">
            <h3>🗣️ Talen in de Top 100</h3>

            <div className="language-chart-sticky">
              <LanguagePieChart data={languageStats} />
            </div>

          </section>

          <section className="stat-block">
            <h3>🏆 Taal-podium per Slaajaan</h3>

            <select
              value={selectedPerson ?? ""}
              onChange={(e) => setSelectedPerson(e.target.value)}
            >
              <option value="">Kies een vriend</option>
              {individualLists.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>

            {friendLanguagePodium && (
              <div className="language-podium">
                {friendLanguagePodium.map((l, i) => {
                  const max = friendLanguagePodium[0].count;
                  const height = 80 + (l.count / max) * 80; // min + schaal

                  return (
                    <div
                      key={l.language}
                      className={`podium-block place-${i + 1}`}
                      style={{ height: `${height}px` }}
                    >
                      <div className="medal">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </div>

                      <div className="flag">
                      {languageToFlagImg(l.language) ? (
                        <img
                          src={languageToFlagImg(l.language)!}
                          alt={l.language}
                          width={20}
                          height={15}
                          style={{ display: "block" }}
                        />
                      ) : (
                        "🌍"
                      )}
                      </div>
                      <div className="language">{l.language}</div>
                      <div className="count">{l.count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="stat-block">
            <h3>🌍 Landen van artiesten (Top 100)</h3>

            {countryStats.map((c) => {
              const code = COUNTRY_CODE_MAP[c.country];

              return (
                <div key={c.country} className="country-row">
                  <span className="flag">
                    {code ? (
                      <img
                        src={countryToFlagImg(code)}
                        alt={c.country}
                        width={20}
                        height={15}
                        style={{ display: "block" }}
                      />
                    ) : (
                      "🌍"
                    )}
                  </span>

                  <span className="country-name">{c.country}</span>

                  <div className="country-bar">
                    <div style={{ width: `${c.count * 4}px` }} />
                  </div>

                  <span className="count">{c.count}</span>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
