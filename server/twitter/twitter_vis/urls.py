from django.conf.urls import url
from django.conf import settings

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^tweets_states/$', views.tweets_states, name='tweets_states'),
    url(r'^tweets_summary/$', views.tweets_summary, name='tweets_summary'),    
    url(r'^top_hashtags/$', views.top_hashtags, name='top_hashtags'),        
]