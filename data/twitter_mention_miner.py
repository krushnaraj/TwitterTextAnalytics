import csv
import re
import os

DATA_PATH = 'data'
INPUT_FILENAME = 'tweets.csv'
OUTPUT_FILENAME = 'tweets_mention.csv'
ATTRIBUTES = ['id', 'mention']

# Code related to twitter hashtag parsing is from this reference: 
# https://marcobonzanini.com/2015/03/09/mining-twitter-data-with-python-part-2/
emoticons_str = r"""
    (?:
        [:=;] # Eyes
        [oO\-]? # Nose (optional)
        [D\)\]\(\]/\\OpP] # Mouth
    )"""

regex_str = [
    r'(?:@[\w_]+)', # @-mentions
    """
    r"(?:\#+[\w_]+[\w\'_\-]*[\w_]+)", # hash-tags
    emoticons_str,
    r'<[^>]+>', # HTML tags
    r'http[s]?://(?:[a-z]|[0-9]|[$-_@.&amp;+]|[!*\(\),]|(?:%[0-9a-f][0-9a-f]))+', # URLs
    r'(?:(?:\d+,?)+(?:\.?\d+)?)', # numbers
    r"(?:[a-z][a-z'\-_]+[a-z])", # words with - and '
    r'(?:[\w_]+)', # other words
    r'(?:\S)' # anything else
    """
]

tokens_re = re.compile(r'('+'|'.join(regex_str)+')', re.VERBOSE | re.IGNORECASE)
emoticon_re = re.compile(r'^'+emoticons_str+'$', re.VERBOSE | re.IGNORECASE)
 
def tokenize(s):
    return tokens_re.findall(s)
 
def preprocess(s, lowercase=False):
    tokens = tokenize(s)
    if lowercase:
        tokens = [token if emoticon_re.search(token) else token.lower() for token in tokens]
    return tokens

tweet_hashtag = []
existing_tweets = set()

f = os.path.join(DATA_PATH, INPUT_FILENAME)
with open(f, 'rb') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        id = row.get('id')
        text = row.get('text')
        if id not in existing_tweets:
            hashtags = preprocess(text, True)
            hashtags = set(hashtags)
            for h in hashtags:
                tweet_hashtag.append({
                        'id': id,
                        'mention': h
                    })
            existing_tweets.add(id)

f = os.path.join(DATA_PATH, OUTPUT_FILENAME)
with open(f, 'wb') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=ATTRIBUTES)
    for t in tweet_hashtag:
        writer.writerow(t)

