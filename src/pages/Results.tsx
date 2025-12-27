// src/pages/Results.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import SongItem from "../components/SongItem";
import Statistics from "../pages/Statistics";

type Selection = {
  id: number;
  rank: number;
};

export type ResultSong = {
  id: number;
  title: string;
  artist: string;
  image_url?: string | null;
  preview_url?: string | null;
  Releasedatum?: string | null;
  points: number;
  appearances: number;
};

export type IndividualList = {
  name: string;
  selections: {
    id: number;
    rank: number;
    title: string;
    artist: string;
  }[];
};

export default function Results() {
  const [allResults, setAllResults] = useState<ResultSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [individualLists, setIndividualLists] = useState<IndividualList[]>([]);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    setLoading(true);

    // 1️⃣ Haal stemmen op
    const { data: votes } = await supabase
      .from("votes")
      .select("name, selections");

    if (!votes) {
      setLoading(false);
      return;
    }

    // 2️⃣ Bereken punten en appearances
    const scoreMap: Record<number, { points: number; appearances: number }> = {};
    votes.forEach((vote) => {
      const selections: Selection[] = vote.selections || [];
      selections.forEach((sel) => {
        const points = 101 - sel.rank;
        if (!scoreMap[sel.id]) scoreMap[sel.id] = { points: 0, appearances: 0 };
        scoreMap[sel.id].points += points;
        scoreMap[sel.id].appearances += 1;
      });
    });

    const songIds = Object.keys(scoreMap).map(Number);
    if (!songIds.length) {
      setLoading(false);
      return;
    }

    // 3️⃣ Haal nummers op
    const { data: songs } = await supabase
      .from("songs")
      .select("id, title, artist, image_url, preview_url, Releasedatum, duration_ms, explicit, language, country_artist")
      .in("id", songIds);

    if (!songs) {
      setLoading(false);
      return;
    }

    // 4️⃣ Bereken gecombineerde resultaten
    const combined: ResultSong[] = songs
      .map((song) => ({
        ...song,
        points: scoreMap[song.id].points,
        appearances: scoreMap[song.id].appearances,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.appearances !== a.appearances) return b.appearances - a.appearances;
        return a.title.localeCompare(b.title);
      });

    setAllResults(combined);

    // 5️⃣ Maak songMap voor individuele lijsten
    const songMap = Object.fromEntries(songs.map((s) => [s.id, s]));

    const lists: IndividualList[] = votes.map((vote) => ({
      name: vote.name,
      selections: (vote.selections || [])
        .sort((a: Selection, b: Selection) => a.rank - b.rank)
        .map((sel: Selection) => ({
          id: sel.id,
          rank: sel.rank,
          title: songMap[sel.id]?.title ?? "Onbekend nummer",
          artist: songMap[sel.id]?.artist ?? "",
        })),
    }));

    setIndividualLists(lists);

    setLoading(false);
  }

  // 6️⃣ Slice top 100 en just missed
  const top100 = useMemo(() => allResults.slice(0, 100), [allResults]);
  const justMissed = useMemo(() => allResults.slice(100, 150), [allResults]);

  // 7️⃣ Filter top 100 op zoekquery
  const filteredTop100 = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return top100;
    return top100.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q)
    );
  }, [query, top100]);

  return (
    <div className="results-layout">
      {/* 🏆 TOP 100 */}
      <section className="results-column results-top100">
        <div className="results-header">
          <input
            type="text"
            placeholder="Zoek op titel of artiest…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="results-list">
          {loading && <p>Uitslagen worden geladen…</p>}
          {!loading &&
            filteredTop100.map((song) => {
              const realRank =
                top100.findIndex((s) => s.id === song.id) + 1;

              return (
                <SongItem
                  key={song.id}
                  rank={realRank}
                  title={song.title}
                  artist={song.artist}
                  image={song.image_url}
                  preview={song.preview_url}
                  points={song.points}
                  appearances={song.appearances}
                />
              );
            })}
        </div>
      </section>

      {/* 📊 STATISTIEKEN */}
      <section className="results-column results-stats">
        <Statistics
          justMissed={justMissed}
          results={allResults}
          top100={top100}
          individualLists={individualLists}
        />
      </section>
    </div>
  );
}
