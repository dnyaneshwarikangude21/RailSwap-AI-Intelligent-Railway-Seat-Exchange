import { Search, SlidersHorizontal, TrainFront, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { trainsApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import TrainCard from "../components/TrainCard";

export default function TrainSearch() {
  const [filters, setFilters] = useState({ q: "", source: "", destination: "" });
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (activeFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const payload = await trainsApi.list(activeFilters);
      setTrains(payload.items || []);
    } catch (err) {
      setError(err.message || "The synthetic timetable could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load({ q: "", source: "", destination: "" });
    // Initial load only; subsequent searches are explicit form submissions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    load(filters);
  }

  function reset() {
    const empty = { q: "", source: "", destination: "" };
    setFilters(empty);
    load(empty);
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <TrainFront size={14} aria-hidden="true" />
            Synthetic timetable
          </span>
          <h2>Discover a fictional journey</h2>
          <p>
            All trains, routes, coaches, and berths are generated demonstration
            data. No live railway API is used.
          </p>
        </div>
      </header>

      <form className="search-panel" onSubmit={handleSubmit}>
        <div className="search-panel-heading">
          <div>
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span>Find journeys</span>
          </div>
          <span className="badge badge-soft">Demo mode</span>
        </div>
        <div className="search-grid">
          <div className="field">
            <label htmlFor="train-search">Train or station</label>
            <input
              id="train-search"
              type="search"
              placeholder="Search by name, number, or city"
              value={filters.q}
              onChange={(event) =>
                setFilters((current) => ({ ...current, q: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="source-filter">Source</label>
            <input
              id="source-filter"
              type="text"
              placeholder="Aurora Junction"
              value={filters.source}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="destination-filter">Destination</label>
            <input
              id="destination-filter"
              type="text"
              placeholder="Coral Bay Central"
              value={filters.destination}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  destination: event.target.value,
                }))
              }
            />
          </div>
          <div className="search-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Search size={16} />
              {loading ? "Searching..." : "Search"}
            </button>
            {hasFilters && (
              <button type="button" className="btn btn-ghost" onClick={reset}>
                <X size={15} />
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {error && <ErrorState message={error} onRetry={() => load(filters)} />}

      <div className="results-heading">
        <div>
          <span className="section-kicker">Available demo trains</span>
          <h3>{trains.length} fictional services</h3>
        </div>
        <span className="muted small">
          Future journeys only · Synthetic seat inventory
        </span>
      </div>

      {loading ? (
        <LoadingState label="Loading synthetic trains..." />
      ) : trains.length === 0 ? (
        <EmptyState
          icon={TrainFront}
          title="No trains match those filters"
          description="Try a broader station search or clear the filters."
          action={
            <button type="button" className="btn btn-secondary btn-small" onClick={reset}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="train-grid">
          {trains.map((train) => (
            <TrainCard key={train.id} train={train} />
          ))}
        </div>
      )}

      <div className="page-footnote">
        Train numbers and station names in this project are fictional. RailSwap AI
        does not claim integration with, authorization from, or data from Indian
        Railways or any other railway operator.
      </div>
    </div>
  );
}
