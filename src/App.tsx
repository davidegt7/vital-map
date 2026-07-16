import { useEffect } from "react";
import { useStore } from "./store";
import { MapView } from "./components/MapView";
import { FilterBar } from "./components/FilterBar";
import { PlaceList } from "./components/PlaceList";
import { PlaceSheet } from "./components/PlaceSheet";
import "./App.css";

export default function App() {
  const { status, error, init, selectedId, select } = useStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, select]);

  return (
    <div className="app">
      <header className="app__head">
        <h1>
          Vital<span>Map</span>
        </h1>
        <p>Comida real en Santiago. Gratis, siempre.</p>
      </header>

      {status === "loading" && <div className="app__state">Cargando lugares…</div>}
      {status === "error" && (
        <div className="app__state app__state--error">
          <p>No se pudieron cargar los lugares.</p>
          <code>{error}</code>
        </div>
      )}

      {status === "ready" && (
        <>
          <FilterBar />
          <main className="app__body">
            <MapView />
            <PlaceList />
          </main>
        </>
      )}

      {selectedId && (
        <>
          <div className="scrim" onClick={() => select(null)} />
          <PlaceSheet />
        </>
      )}
    </div>
  );
}
