CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    email_verified_at TIMESTAMP,
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_users_uid ON users(uid);


INSERT INTO users (uid, email, username, name, password_hash)
VALUES ('root', 'root@root.ai', 'root', 'Root User', 'RandomHash')
ON CONFLICT (uid) DO NOTHING;


CREATE TABLE graphs (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    label TEXT,
    format_version INT NOT NULL DEFAULT 1,
    readonly BOOLEAN NOT NULL DEFAULT FALSE,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    thumbnail TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
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
    graph_uid TEXT REFERENCES graphs(uid) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE INDEX idx_chats_uid ON chats(uid);
CREATE INDEX idx_chats_user_uid ON chats(user_uid);
CREATE INDEX idx_chats_graph_uid ON chats(graph_uid);


CREATE TABLE user_billing (
    user_uid TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'plus')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
CREATE INDEX idx_user_billing_plan ON user_billing(plan);
CREATE INDEX idx_user_billing_status ON user_billing(status);


CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
CREATE INDEX idx_email_verification_tokens_user_uid ON email_verification_tokens(user_uid);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
