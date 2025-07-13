CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_uid ON users(uid);


CREATE TABLE graphs (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    readonly BOOLEAN DEFAULT FALSE,
    label TEXT,
    graph_data JSONB,
    format_version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_graphs_uid ON graphs(uid);


CREATE TABLE graph_user (
    id SERIAL PRIMARY KEY,
    graph_id INT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (graph_id, user_id)
);


CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    label TEXT,
    user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_chats_uid ON chats(uid);
CREATE INDEX idx_chats_user_uid ON chats(user_uid);
