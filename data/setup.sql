-- create tweets table.
CREATE TABLE tweet (
        id VARCHAR(64) NOT NULL,
        text TEXT NOT NULL,
        publish_date TIMESTAMP NOT NULL,
        latitude DECIMAL NOT NULL,
        longitude DECIMAL NOT NULL,
        userid VARCHAR(64),
        username VARCHAR(64),
        sentiment SMALLINT NOT NULL
    );
-- copy data
\copy tweet FROM '/Users/hahooy1/src/course/557a/twitter/data/data/tweets.csv' DELIMITER ',' CSV
-- remove duplicate
CREATE TABLE tmptweet (
        id VARCHAR(64) NOT NULL,
        text TEXT NOT NULL,
        publish_timestamp TIMESTAMP NOT NULL,
        latitude DECIMAL NOT NULL,
        longitude DECIMAL NOT NULL,
        userid VARCHAR(64),
        username VARCHAR(64),
        sentiment SMALLINT NOT NULL
    );
INSERT INTO tmptweet SELECT DISTINCT * FROM tweet;
DROP TABLE tweet;
ALTER TABLE tmptweet RENAME TO tweet;
-- add constraints
ALTER TABLE tweet ADD PRIMARY KEY (id);
ALTER TABLE tweet ADD COLUMN county_fips CHAR(5);
ALTER TABLE tweet ADD FOREIGN KEY (county_fips) REFERENCES county (county_fips) ON DELETE CASCADE ON UPDATE CASCADE;
UPDATE tweet SET county_fips = county.county_fips FROM county WHERE ST_Intersects(county.boundary, ST_SetSRID(ST_Point(tweet.longitude, tweet.latitude), 4326));
ALTER TABLE tweet ADD COLUMN publish_date DATE;
UPDATE tweet SET publish_date = date(tweet.publish_timestamp);
ALTER TABLE tweet ALTER publish_date SET NOT NULL; 

-- Create tweet_has_hashtag relationship table.
CREATE TABLE tweet_has_hashtag (
    id VARCHAR(64) NOT NULL,
    hashtag VARCHAR(128) NOT NULL,
    PRIMARY KEY (id, hashtag),
    FOREIGN KEY (id) REFERENCES tweet(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data into tweet_has_hashtag relationship table.
\copy tweet_has_hashtag FROM '/Users/hahooy1/src/course/557a/twitter/data/data/tweets_hashtag.csv' DELIMITER ',' CSV
-- Create hashtag table.
create table hashtag (
    hashtag VARCHAR(128) PRIMARY KEY
);
-- Insert data into hashtag table.
INSERT INTO hashtag SELECT DISTINCT(hashtag) FROM tweet_has_hashtag;
-- Add hashtag foreign key to tweet_has_hashtag.
ALTER TABLE tweet_has_hashtag ADD FOREIGN KEY (hashtag) REFERENCES hashtag(hashtag) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index
CREATE EXTENSION pg_trgm;
create index on hashtag using gin (hashtag gin_trgm_ops);
create index on tweet (publish_date);
create index on tweet (publish_timestamp);

-- Remove job advertisement.
DELETE FROM tweet WHERE id IN (SELECT t.id FROM tweet AS t join tweet_has_hashtag AS thh ON t.id = thh.id WHERE thh.hashtag ilike '%job%' OR thh.hashtag ilike '%hiring%');

-- Create temp table for long queries
create table tweets_agged as select s.name as name, 
                         s.abbreviation as abbreviation,
                         s.statefp as statefp, 
                         s.latitude as latitude, 
                         s.longitude as longitude,
                         t.publish_date as publish_date,
                         count(*) as num_tweet,
                         sum(case when t.sentiment = 0 then 1 else 0 end) as num_neg_tweet,
                         sum(case when t.sentiment = 2 then 1 else 0 end) as num_neu_tweet,
                         sum(case when t.sentiment = 4 then 1 else 0 end) as num_pos_tweet,                    
                         avg(t.sentiment) as avg_sentiment,
                         string_agg(hashtag, ' ') as hashtags
                 from tweet as t 
                     join county as c on t.county_fips = c.county_fips
                     join state as s on c.statefp = s.statefp
                     join tweet_has_hashtag as thh on t.id = thh.id
                     group by (t.publish_date, s.name, s.abbreviation, s.statefp, s.latitude, s.longitude);