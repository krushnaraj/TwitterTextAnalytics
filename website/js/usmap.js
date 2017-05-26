function usmap() {
  // Constants.
  // var SENTIMENT_DOMAIN = [0, 1.8, 2, 2.2, 4];
  // var SENTIMENT_COLOR_RANGE = ["#FF0000", "#e06c00", "#ffff00", "#00ffff", "#0000ff"];

  var SENTIMENT_DOMAIN = [0, 2, 4];
  var SENTIMENT_COLOR_RANGE = ["#FF0000", "#ffffcc", "#0000ff"];
  var MAP_DEFAULT_FILL = "#d7d7d7";
  var MAP_BORDER_COLOR = "#ffc1b1";
  var BUBBLE_DEFAULT_FILL = "#272D2D";
  var BUBBLE_DEFAULT_OPACITY = 0.6;
  var BUBBLE_HOVER_FILL = "rgb(217,91,67)";
  var BUBBLE_HOVER_OPACITY = 0.5;
  console.log(BUBBLE_DEFAULT_FILL);
  // Datamap.
  var gisMap = new Datamap({
      scope: 'usa',
      width: 900,
      element: document.getElementById('mapvis'),
      geographyConfig: {
        highlightBorderColor: MAP_BORDER_COLOR	
      },
      highlightBorderWidth: 5,
      fills: {
        defaultFill: MAP_DEFAULT_FILL,
      }
  });

  //Bubble hover
  function hoverMap(data)
  {
	  var pos, neg, neu, state;
	  
	  pos = data.total_pos_tweet;
	  neg = data.total_neg_tweet;
	  neu = data.total_neu_tweet;
	  state = data.name;
	  
	  var dataforPlot=[ {
		  x:['Negative','Neutral', 'Positive'],
		  y:[neg, neu, pos],
		  type:'bar',
		  marker: {
            color: SENTIMENT_COLOR_RANGE,
            line: {
                     color: 'rgba(0,0,0,1.0)',
                     width: 1
                 }
      }
    }];
	
  	var layout = {
        title: state,
        // title: state + "-" + data.total_num_tweet,
        font:{
        family: 'Raleway, sans-serif'
        },
        showlegend: false,
        xaxis: {
        tickangle:-45
        },
        yaxis: {
        zeroline: false,
        gridwidth: 2
       },
       bargap :0.05
      };
  	Plotly.newPlot('hoverinfo', dataforPlot, layout);  	  
  }
  
  // Update the map.
  function updateMap(data) {
    // Color scale.
    var colorScale = d3.scale.linear()
                      .domain(SENTIMENT_DOMAIN)
                      .range(SENTIMENT_COLOR_RANGE);

    var allStates = Datamap.prototype.usaTopo.objects.usa.geometries.map(function(state) {
      return state.id;
    });
    var colors = {};
    for (var i = 0; i < allStates.length; i++) {
      colors[allStates[i]] = MAP_DEFAULT_FILL;
    }
    for (var i = 0; i < data.tweets_per_state.length; i++) {
      colors[data.tweets_per_state[i].abbreviation] = colorScale(data.tweets_per_state[i].avg_sentiment);
    }
    // gisMap.labels(data.abbreviation);
    gisMap.updateChoropleth(colors, {reset: true});
  }

  // Create bubbles.
  function updateBubbles(data, wordcloud) {
    insertRadius(data.tweets_per_state);
    gisMap.bubbles( data.tweets_per_state);
    hoverMap(data.tweets_all_states);
    d3.selectAll("circle")
      .style("fill", BUBBLE_DEFAULT_FILL)
      .style("opacity", BUBBLE_DEFAULT_OPACITY)
      .on("mouseover", function(d) {
        hoverMap(d);
        d3.select(this)
          .transition()
          .duration(500)
          .style("fill", BUBBLE_HOVER_FILL)  
          .style("opacity", BUBBLE_HOVER_OPACITY);
        wordcloud.update(d.hashtags);
		
      })
      .on("mouseout", function(d) {
        hoverMap(data.tweets_all_states);
        d3.select(this)
          .transition()
          .duration(500)
          .style("fill", BUBBLE_DEFAULT_FILL)
          .style("opacity", BUBBLE_DEFAULT_OPACITY);
        wordcloud.update(data.hashtags_all_states);
      });
  }

  // Calculate the radius of the bubbles based on the number of tweets.
  function insertRadius(data) {
      var maxTweets = Math.max.apply(null, data.map(function (d) {
          return d.total_num_tweet;
      }));

      for (var i = 0; i < data.length; i++) {
          var tweets = data[i].total_num_tweet;
          if (tweets == maxTweets) {
              data[i].radius = ((tweets / maxTweets) * 100) - 30;
             
          } else {
              data[i].radius = (tweets / maxTweets) * 100;
          }
           data[i].fillKey='bubbleColor';
      }
      updateCircleLegend(maxTweets);
  }

  // Add circle legend, reference: https://bl.ocks.org/aubergene/4723857
  function updateCircleLegend(maxTweets) {
    var margin = {top: 5, right: 5, bottom: 5, left: 5};
    var width = CIRCLE_LEGEND_WIDTH,
        height = CIRCLE_LEGEND_WIDTH;
    var legend = d3.select('#circle-legend');
    // Remove old legend.
    legend.selectAll('svg').remove();
    var svg = legend.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    // Style the position of the legend.
    legend.style('left', margin.left + 'px')
          .style('top', margin.right + 'px');

    var scale = d3.scale.linear()
            .domain([0, maxTweets])
            .range([0, 50]);

    var circleKey = circleLegend()
        .scale(scale)
        // Return falsey value from tickFormat to remove it
        .tickFormat(function(d) {
          return d % 3 == 0 ? d : null
        });

    svg.append('g')
      .attr('transform', 'translate(' + width/1.5 + ',' + height/1.5 + ')')
      .call(circleKey);
  }

  return {
    updateMap: updateMap,
    updateBubbles: updateBubbles,
  };
}







