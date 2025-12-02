-- Database initialization script for Radio Calico
-- This script sets up the song_ratings table and indexes

-- Create the song_ratings table
CREATE TABLE IF NOT EXISTS song_ratings (
    id SERIAL PRIMARY KEY,
    artist TEXT NOT NULL,
    title TEXT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
    user_fingerprint TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_song_rating UNIQUE (artist, title, user_fingerprint)
);

-- Create index for faster lookups by artist and title
CREATE INDEX IF NOT EXISTS idx_song_ratings_artist_title ON song_ratings(artist, title);

-- Create index for faster lookups by user fingerprint
CREATE INDEX IF NOT EXISTS idx_song_ratings_user_fingerprint ON song_ratings(user_fingerprint);

-- Create index for faster lookups by created_at for analytics
CREATE INDEX IF NOT EXISTS idx_song_ratings_created_at ON song_ratings(created_at);

-- Grant permissions (adjust if using different user)
-- GRANT ALL PRIVILEGES ON TABLE song_ratings TO admin;
-- GRANT USAGE, SELECT ON SEQUENCE song_ratings_id_seq TO admin;

-- Insert sample data for testing (optional - comment out for production)
-- INSERT INTO song_ratings (artist, title, rating, user_fingerprint)
-- VALUES
--     ('Sample Artist', 'Sample Song', 1, 'sample-fingerprint-1'),
--     ('Another Artist', 'Another Song', -1, 'sample-fingerprint-2')
-- ON CONFLICT (artist, title, user_fingerprint) DO NOTHING;

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE 'Radio Calico database initialized successfully';
END $$;
