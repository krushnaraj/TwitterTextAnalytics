import csv
import json
import os
import psycopg2
import re
import sys
import subprocess


#########################################################
# Constants definitions.
#########################################################

DATA_PATH = 'data'
CENSUS_STATE = os.path.join('tl_2016_us_state', 'tl_2016_us_state.shp')
CENSUS_COUNTY = os.path.join('tl_2016_us_county', 'tl_2016_us_county.shp')
TWEET = 'tweets.csv'
DBNAME = 'twitter'
DBUSER = 'hahooy1'


#########################################################
# Connect to DB.
#########################################################

try:
    conn = psycopg2.connect(database=DBNAME, user=DBUSER)
except:
    print 'failed to connect to DB'
cur = conn.cursor()

# Create PostGIS extension.
cur.execute("""CREATE EXTENSION IF NOT EXISTS postgis;""")
conn.commit()

# If we want to create tables from scratch, drop all existing tables first.
cur.execute("""
    DROP TABLE IF EXISTS state CASCADE;
    DROP TABLE IF EXISTS county CASCADE;
    DROP TABLE IF EXISTS tweet;
    DROP TABLE IF EXISTS hashtag CASCADE;
    DROP TABLE IF EXISTS tweet_has_hashtag CASCADE;
    """)
conn.commit()

#########################################################
# Create state table from Census state shape file.
#########################################################

# Reference: http://stackoverflow.com/questions/9393425/python-how-to-execute-shell-commands-with-pipe
subprocess.call('shp2pgsql -I %s state | psql -d %s' % (os.path.join(DATA_PATH, CENSUS_STATE), DBNAME), shell=True)
"""
p1 = subprocess.Popen(['shp2pgsql', '-I', os.path.join(DATA_PATH, CENSUS_STATE), 'state'], stdout=subprocess.PIPE)
p2 = subprocess.Popen(['psql', '-d', DBNAME], stdin=subprocess.PIPE)
p2.communicate()
"""
cur.execute("""
    -- Use statefp as the primary key for the state table.
    ALTER TABLE state DROP CONSTRAINT state_pkey;
    ALTER TABLE state DROP COLUMN gid;
    ALTER TABLE state ADD PRIMARY KEY (statefp);
    -- Remove columns that are not needed in our schema.
    ALTER TABLE state DROP COLUMN region,
                        DROP COLUMN geoid,
                        DROP COLUMN division,
                        DROP COLUMN statens,
                        DROP COLUMN lsad,
                        DROP COLUMN mtfcc,
                        DROP COLUMN funcstat,
                        DROP COLUMN aland,
                        DROP COLUMN awater;
    -- Rename columns to match the names in our schema.
    ALTER TABLE state RENAME stusps TO abbreviation;
    ALTER TABLE state RENAME geom TO boundary;
    ALTER TABLE state RENAME intptlat TO latitude;
    ALTER TABLE state RENAME intptlon TO longitude;
    -- Update boundary's srid.
    SELECT UpdateGeometrySRID('state','boundary',4326);
    """)
conn.commit()

#########################################################
# Create county table from Census county shape file.
#########################################################

subprocess.call('shp2pgsql -I %s county | psql -d %s' % (os.path.join(DATA_PATH, CENSUS_COUNTY), DBNAME), shell=True)
cur.execute(
    """
    -- Use county fips as the primary key.
    ALTER TABLE county DROP CONSTRAINT county_pkey;
    ALTER TABLE county ADD PRIMARY KEY (geoid);
    -- Add state foreign key to the county table.
    ALTER TABLE county ADD FOREIGN KEY (statefp) REFERENCES state (statefp) ON DELETE CASCADE ON UPDATE CASCADE;
    -- Remove columns that are not needed in our schema.
    ALTER TABLE county DROP COLUMN gid,
                        DROP COLUMN namelsad,
                        DROP COLUMN countyfp,
                        DROP COLUMN countyns,
                        DROP COLUMN lsad,
                        DROP COLUMN classfp,
                        DROP COLUMN mtfcc,
                        DROP COLUMN csafp,
                        DROP COLUMN cbsafp,
                        DROP COLUMN metdivfp,
                        DROP COLUMN funcstat,
                        DROP COLUMN aland,
                        DROP COLUMN awater;
    -- Rename columns to match the names in our schema.
    ALTER TABLE county RENAME geoid TO county_fips;
    ALTER TABLE county RENAME geom TO boundary;
    ALTER TABLE county RENAME intptlat TO latitude;
    ALTER TABLE county RENAME intptlon TO longitude;
    -- Update boundary's srid.
    SELECT UpdateGeometrySRID('county','boundary',4326);
    """
    )
conn.commit()

cur.close()
conn.close()

print 'Finished.'
