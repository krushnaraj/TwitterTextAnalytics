import csv
from datetime import datetime
from email.utils import parsedate_tz
import os
import requests
import sys
import twitter
import json
import io

# Credentials.
API_K = 'vWtltMEHpveFMImD76UoXFKyM'
API_S = 'FISog45RFpmfZE8VSjcdmq76616C5vZIsOa1HcKsGll2Nj7STv'
ACCESS_TOKEN = '3996102433-iRDdGsscdcG1JdjzZtj0cN0F6wL7GcGzl4HDGxA'
ACCESS_TOKEN_S = 'oDkhR6e4mErIrGPj4lHdL3NRNPGW1tlhDQLIyHQGVFOWl'
# Constants.
US_CONTINENTAL_BOX = ['-125.0011', '24.9493', '-66.9326', '49.5904']
ATTRIBUTES = ['id', 'text', 'publish_date', 'latitude', 'longitude', 'userid', 'username', 'polarity']
FILENAME = 'tweets.csv'
SENTIMENT140_URL = 'http://www.sentiment140.com/api/bulkClassifyJson?appid=iamhuangyz@gmail.com'
# Stream up to 5000 tweets each time bacause Sentiment140 can analyze up to thousands of tweets per request.
MAX_BATCH_SIZE = 5000

def stream_tweets(api, num_tweets):
    if num_tweets > MAX_BATCH_SIZE:
        print 'your request number of tweets was %d, it is reduced to %d because it is too large' % (num_tweets, MAX_BATCH_SIZE)
        num_tweets = MAX_BATCH_SIZE

    # Stream tweets from Twitter API.
    stream = api.GetStreamFilter(locations=US_CONTINENTAL_BOX)

    tweets = []
    while len(tweets) < num_tweets:
        tweet = stream.next()
        if tweet.get('lang') == 'en' and tweet.get('coordinates') != None \
            and 'created_at' in tweet and 'text' in tweet:
            t = {
                'id': tweet['id'],
                'text': tweet['text'],
                'publish_date': sql_date_f_twitter(tweet['created_at']),
                'latitude': tweet['coordinates']['coordinates'][1],
                'longitude': tweet['coordinates']['coordinates'][0],
                'userid': tweet['user']['id'],
                'username': tweet['user']['name'].encode('ascii', 'ignore')
            }
            tweets.append(t)

    # Tag tweets with sentiments.
    data = {'data': tweets}
    res = requests.post(SENTIMENT140_URL, json=data) 
    tweets = res.json()['data']
    for t in tweets:
        t.pop('meta')
        t['text'] = t['text'].encode('ascii', 'ignore')
    return tweets


def sql_date_f_twitter(t):
    sql_d_format = '%Y-%m-%d %H:%M:%S'
    parsed = parsedate_tz(t)
    return datetime.strftime(datetime(*parsed[:6]), sql_d_format)



if __name__ == '__main__':
    num_tweets = 100
    if len(sys.argv) == 2:
        num_tweets = int(sys.argv[1])
    # Authentication with Twitter.
    with io.open('credentials.json') as cred:
        creds = json.load(cred)
        api = twitter.Api(**creds['twitter'])

    while num_tweets > 0:
        tweets = stream_tweets(api, num_tweets)
        num_tweets -= len(tweets)
        print '%d tweets left' % num_tweets
        with open(FILENAME, 'ab') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=ATTRIBUTES)
            for t in tweets:
                writer.writerow(t)
