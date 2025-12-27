import { useEffect, useState } from "react";
import Results from "./pages/Results";
import { supabase } from "./supabaseClient";
import "./App.css";

export default function App() {
  /* =========================
     QUOTE VAN DE DAG
  ========================= */
  const quotes = [
    { text: "“That's our handoek”", author: "Thijs 2016", image: "https://i.imgur.com/1OM5FNn.jpeg" },
    { text: "“Toen jij zei slaap lekker was ik nog aan 't likken”", author: "Haverkort 2016", image: "https://i.imgur.com/5MyVsxw.png" },
    { text: "“Ik steel geen schoenen, ik steel alleen maar harten”", author: "Dana 2025", image: "https://i.imgur.com/QUCMFoY.png" },
    { text: "“Je wordt hier gewoon progressief in je kontje geneukt”", author: "Hamel 2025", image: "https://i.imgur.com/8Iyhf3W.jpeg" },
    { text: "“Ja ik kan ècht wel alleen naar huis fietsen”", author: "Leon 2015", image: "https://i.imgur.com/AkAcFQx.jpeg" },
    { text: "“Ik neuk vloeiend Duits”", author: "Tim 2016", image: "https://i.imgur.com/76kTeQ5.jpeg" },
    { text: "“Als de zon vijf duimen boven de vlierbes uitkomt en de haan hinnikt, is het tijd om ginder te gaan”", author: "Danny 2015", image: "https://i.imgur.com/rcc5L90.png" },
    { text: "“Ik ben ook een warmbloedig animaal”", author: "Pola 2025", image: "https://i.imgur.com/qklRtnr.png" },
    { text: "“Ik heb helemaal geen tv, ik heb er wel twee”", author: "Carsten 2014", image: "https://i.imgur.com/jnBr00W.png" },
    { text: "“Er zit echt wel ketsbaar materiaal bij”", author: "Timo 2025", image: "https://i.imgur.com/O6qTQ5l.jpeg" },
    { text: "“We kunnen echt wel met z'n allen in een kleine Sophie”", author: "Thijs 2020", image: "https://i.imgur.com/1OM5FNn.jpeg" },
    { text: "“Limburg is een beetje het Glanerbrug van Nederland”", author: "Haverkort 2021", image: "https://i.imgur.com/5MyVsxw.png" },
    { text: "“Ik ben net lijm”", author: "Dana 2022", image: "https://i.imgur.com/QUCMFoY.png" },
    { text: "“Ah nee dat heb ik sowieso niet gedaan, want daar weet ik niks meer vanaf”", author: "Hamel 2020", image: "https://i.imgur.com/8Iyhf3W.jpeg" },
    { text: "“Die Warmtepompen, die vind ik echt geil”", author: "Leon 2023", image: "https://i.imgur.com/AkAcFQx.jpeg" },
    { text: "“Had ik maar een uwe”", author: "Tim 2022", image: "https://i.imgur.com/76kTeQ5.jpeg" },
    { text: "“Als het kan schommelen, kan het ook wippen”", author: "Danny 2020", image: "https://i.imgur.com/rcc5L90.png" },
    { text: "“Wc zo koud ik poep met trui aan”", author: "Pola 2025", image: "https://i.imgur.com/xuWUHxF.jpeg" },
    { text: "“Als ik als chick was geboren, zou ik me toch een dikke pot zijn”", author: "Carsten 2022", image: "https://i.imgur.com/jnBr00W.png" },
    { text: "“Volgens Knor wereldgerechten ben ik ook een gezin van 3”", author: "Timo 2020", image: "https://i.imgur.com/O6qTQ5l.jpeg" },
  ];

  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const idx = new Date().getDate() % quotes.length;
    setQuote(quotes[idx]);
  }, []);

  /* =========================
     POPUPS
  ========================= */
  const [showPopup, setShowPopup] = useState(false);
  const [showShop, setShowShop] = useState(false);

  async function logPopupClick() {
    try {
      await supabase.from("popup_clicks").insert([{ name: "results-page" }]);
    } catch {
      /* ignore */
    }
  }

  function openPopup() {
    setShowPopup(true);
    logPopupClick();
  }

  function closePopup() {
    setShowPopup(false);
  }

  function openShop() {
    setShowShop(true);
  }

  function closeShop() {
    setShowShop(false);
  }

  /* ========================= RENDER ========================= */
  return (
    <div className="container">
      <header className="site-header">
        <div className="site-title">
          <h1> 🐱 Geef Slaaj Top 100 🐱</h1>
        </div>
      </header>

      <div className="banner-layout">
        {/* ================= LEFT BANNER ================= */}
        <div className="side-banner left-banner">
          <div className="ad-content quote-banner">
            <div className="dancing-slaaj">🥬</div>
            <h3>💬 Quote van de dag</h3>
            <img src={quote.image} alt={quote.author} className="quote-img" />
            <p className="quote-text">{quote.text}</p>
            <p className="quote-author">– {quote.author}</p>
            <button className="mystery-btn" onClick={openPopup}>❓</button>
          </div>
        </div>

        {/* ================= MIDDLE ================= */}
        <main className="main-card">
          <Results />
        </main>

        {/* ================= RIGHT BANNER ================= */}
        <div className="side-banner right-banner">
          <div className="ad-content animation-banner">
            <div className="dancing-cat">🐱</div>
            <h3>🍺 </h3>
            <h3> Geef Slaaj
              2016 – 2026</h3>
            <p>De beste slaajpokkoes van het afgelopen decenium!</p>
          </div>

          <img
            src="https://i.imgur.com/Jn0km69.png"
            alt="Neue Kollektion"
            className="clickable-collection-img"
            onClick={openShop}
          />
        </div>
      </div>

      {/* ================= POPUP ================= */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-window" onClick={(e) => e.stopPropagation()}>
            <h2>🍻 Trek een bak!</h2>
            <img
              src="https://i.imgur.com/AZxrTGM.jpeg"
              alt="Trek een bak"
              className="popup-img"
            />
            <button className="close-popup" onClick={closePopup}>
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* ================= SHOP POPUP ================= */}
      {showShop && (
        <div className="popup-overlay" onClick={closeShop}>
          <div className="popup-window shop" onClick={(e) => e.stopPropagation()}>
            <h2>🛍️ NEUE KOLLEKTION</h2>
            <img src="https://i.imgur.com/6qIfIYz.png" className="popup-img" />
            <img src="https://i.imgur.com/6e8s94t.png" className="popup-img" />
            <p>heute billig, morgen teuer</p>
            <button className="close-popup" onClick={closeShop}>
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
