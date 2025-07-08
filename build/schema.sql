-- GRAPHS table
CREATE TABLE graphs (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,     -- Unique graph ID (e.g. UUID or short ID)
    name TEXT,                    -- Nullable name, e.g. "Untitled" by default
    graph JSONB NOT NULL          -- The graph structure
);

CREATE INDEX idx_graphs_uid ON graphs(uid);
