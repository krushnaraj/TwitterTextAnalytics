from collections import Counter
from datetime import date
import json
import psycopg2
import time

from nltk.corpus import stopwords

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

stopWordsEn = stopwords.words("english")

def index(request):
    return HttpResponse(json.dumps('hello world!'))

@csrf_exempt
def tweets_summary(request):
    ret = {}

    with psycopg2.connect(host=settings.DATABASES['default']['HOST'], database=settings.DATABASES['default']['NAME'], user=settings.DATABASES['default']['USER'], password=settings.DATABASES['default']['PASSWORD']) as conn:
        with conn.cursor() as cur:
            SQL = "select count(*) from tweet_has_hashtag;"
            cur.execute(SQL)
            ret['num_tweets'] = cur.fetchone()[0]
            SQL = "select count(*) from hashtag;"
            cur.execute(SQL)
            ret['num_hashtags'] = cur.fetchone()[0]
            SQL = """select publish_date, count(*) as total_tweets, 
                        sum(case when sentiment = 4 then 1 end) as positive_tweets, 
                        sum(case when sentiment = 2 then 1 end) as neutral_tweets, 
                        sum(case when sentiment = 0 then 1 end) as negative_tweets 
                        from tweet group by publish_date;"""
            cur.execute(SQL)
            ret['tweet_timeline'] = []
            for i in cur.fetchall():
                ret['tweet_timeline'].append({
                                                'date':i[0].strftime('%Y-%m-%d'), 
                                                'total_tweets':i[1],
                                                'positive_tweets':i[2],
                                                'neutral_tweets':i[3],
                                                'negative_tweets':i[4]
                                                })
            SQL = """
                select publish_date, count(*) 
                from tweet as t 
                join tweet_has_hashtag as thh 
                on t.id = thh.id 
                group by publish_date;
            """
            cur.execute(SQL)
            ret['hashtag_timeline'] = []
            for i in cur.fetchall():
                ret['hashtag_timeline'].append({
                                                'date':i[0].strftime('%Y-%m-%d'), 
                                                'total_hashtags':i[1]
                                                })
            print ret['hashtag_timeline']
    return HttpResponse(json.dumps(ret))    


@csrf_exempt
def top_hashtags(request):
    ret = []
    phrase = request.GET.get('phrase')
    if phrase is None:
        return HttpResponse("Error: the limit parameter is required.")

    with psycopg2.connect(host=settings.DATABASES['default']['HOST'], database=settings.DATABASES['default']['NAME'], user=settings.DATABASES['default']['USER'], password=settings.DATABASES['default']['PASSWORD']) as conn:
        with conn.cursor() as cur:
            SQL = "select hashtag from hashtag where hashtag ilike %s order by char_length(hashtag);"
            cur.execute(SQL, ['%'+phrase+'%'])
            for i in cur.fetchall():
                ret.append(i[0])
    return HttpResponse(json.dumps(ret))


@csrf_exempt
def tweets_states(request):
    hashtag = request.GET.get('hashtag')
    d = request.GET.get('date')

    if hashtag is not None and d is not None:
        SQL = """
            with filtered_tweet as (
                select t.* from tweet as t join tweet_has_hashtag as thh on t.id = thh.id
                where thh.hashtag = %s and t.publish_date = %s
            )
            select s.name as name, 
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
            from filtered_tweet as t 
                join county as c on t.county_fips = c.county_fips
                join state as s on c.statefp = s.statefp
                join tweet_has_hashtag as thh on t.id = thh.id
                group by (t.publish_date, s.name, s.abbreviation, s.statefp, s.latitude, s.longitude);"""
        params = [hashtag, d]
    elif hashtag is not None:
        SQL = """
            with filtered_tweet as (
                select t.* from tweet as t join tweet_has_hashtag as thh on t.id = thh.id
                where thh.hashtag = %s
            )
            select s.name as name, 
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
            from filtered_tweet as t 
                join county as c on t.county_fips = c.county_fips
                join state as s on c.statefp = s.statefp
                join tweet_has_hashtag as thh on t.id = thh.id
                group by (t.publish_date, s.name, s.abbreviation, s.statefp, s.latitude, s.longitude);"""
        params = [hashtag]
    elif d is not None:
        SQL = """
            with filtered_tweet as (
                select t.*, thh.hashtag from tweet as t join tweet_has_hashtag as thh on t.id = thh.id
                where t.publish_date = %s
            )
            select s.name as name, 
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
            from filtered_tweet as t 
                join county as c on t.county_fips = c.county_fips
                join state as s on c.statefp = s.statefp
                group by (t.publish_date, s.name, s.abbreviation, s.statefp, s.latitude, s.longitude);"""
        params = [d]
    else:
        SQL = """select * from tweets_agged;"""
        params = []
    
    ret = {}
    with psycopg2.connect(host=settings.DATABASES['default']['HOST'], database=settings.DATABASES['default']['NAME'], user=settings.DATABASES['default']['USER'], password=settings.DATABASES['default']['PASSWORD']) as conn:
        with conn.cursor() as cur:
            print params
            start = time.time()
            cur.execute(SQL, params)
            for i in cur.fetchall():
                ret_entry = {'name':i[0],
                            'abbreviation':i[1],
                            'statefp':i[2],
                            'latitude':float(i[3]),
                            'longitude':float(i[4]),
                            'publish_date':i[5].strftime('%Y-%m-%d'),
                            'total_num_tweet':int(i[6]),
                            'total_neg_tweet':int(i[7]),
                            'total_neu_tweet':int(i[8]),
                            'total_pos_tweet':int(i[9]),                                                                                    
                            'avg_sentiment':float(i[10]),
                            'hashtags':[{'text': c[0], 'size': c[1]} for c in Counter(i[11].split()).most_common()[:20]]}
                if ret_entry['publish_date'] not in ret:
                    ret[ret_entry['publish_date']] = {'tweets_per_state': [ret_entry]}
                else:
                    ret[ret_entry['publish_date']]['tweets_per_state'].append(ret_entry)
            end = time.time()

    for (_, ret_per_date) in ret.items():
        ret_per_date['hashtags_all_states'] = \
                                [{'text': c[0], 'size': c[1]} for c in \
                                    sum([Counter({h['text']: h['size']}) \
                                            for t in ret_per_date['tweets_per_state'] \
                                            for h in t['hashtags']], Counter()).most_common()[:40]]
        # Compute the total number of positive, negative and neutral tweets for the whole country.
        ret_per_date['tweets_all_states'] = {
            'total_neg_tweet': 0,
            'total_neu_tweet': 0,
            'total_pos_tweet': 0,
            'name': 'US'
        }
        for t in ret_per_date['tweets_per_state']:
            ret_per_date['tweets_all_states']['total_neg_tweet'] += t['total_neg_tweet']
            ret_per_date['tweets_all_states']['total_neu_tweet'] += t['total_neu_tweet']
            ret_per_date['tweets_all_states']['total_pos_tweet'] += t['total_pos_tweet']

    print end - start
    res = HttpResponse(json.dumps(ret))
    return res

