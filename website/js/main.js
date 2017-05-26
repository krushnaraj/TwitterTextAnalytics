$(function() {
    // Constants.
    var baseURL = "https://twitter-vis-site.tk:8000/twitter_vis/";
    // var baseURL = "http://127.0.0.1:9000/twitter_vis/";
    var tweetsByStatesURL = "tweets_states/";
    var hashtagURL = "top_hashtags/";

    // UI variables.
    var smallWCWidth = 350;
    var smallWCHeight = 300;

    //Create a new instance of the word cloud visualisation.
    var smallWordCloud = wordCloud('#small-wordcloud-vis', smallWCWidth, smallWCHeight);

    // Create a gis map.
    var gisMap = usmap();
    // Themeriver.
    var river = themeriver('#themeriver');
    drawLegend();
    // Query parameters.
    var params = {};

    // Query wrapper.
    function queryTweets(params) {
        // Query data and render.
        $.get( baseURL + tweetsByStatesURL, params ).done(function( data ) {
            data = JSON.parse(data);
            console.log(data);
            river.update(data, 0, renderData);
            renderData(data[river.getCurrentDate()]);
        });
    }

    // Query summary.
    function getSummary() {
        $.get(summaryURL).done(function(data) {
            data = JSON.parse(data);
        });
    }
  
    // make a new request after the user select a hashtag.
    function renderData(dataAtDate) {
        smallWordCloud.update(dataAtDate.hashtags_all_states);
        gisMap.updateBubbles(dataAtDate, smallWordCloud);
        gisMap.updateMap(dataAtDate);		
    }

    // Initialize visualizations that don't rely on the server.
    function initVisStatic() {
        // Autocomplete for hashtags.
        var options = {
            url: function(phrase) {
                return baseURL + hashtagURL + "?phrase=" + phrase;
            },
            list: {
                maxNumberOfElements: 15,
                match: {
                    enabled: true
                },
                onClickEvent: function() {
                    var value = $("#search-hashtag").getSelectedItemData();
                    params.hashtag = value;
                    console.log(params);
                    queryTweets(params);
                }
            },
            placeholder: "type a hashtag",
            requestDelay: 500,
            theme: "square"
        };
        $("#search-hashtag").easyAutocomplete(options);
    }

    initVisStatic();
    queryTweets(params); // Initial query.
	
});

