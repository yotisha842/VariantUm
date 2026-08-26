CREATE TABLE worker_processed_events (
    event_key VARCHAR(255) PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
