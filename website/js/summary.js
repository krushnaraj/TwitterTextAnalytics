 $(function() {
     

     function drawSummaryGraphs() {
         // Query data and render.
         $.get(summaryURL).done(function(data) {
             data = JSON.parse(data);
             //console.log(data.tweet_timeline);
             generateTimeLineGraph(data.tweet_timeline);
             generateBarPlots(data.tweet_timeline);
         });
     }

     function generateBarPlots(data) {

         var positive = [];
         var negative = [];
         var neutral = [];
         var dates = [];

         data.sort(function(d1, d2) {

             return new Date(d1.date) - new Date(d2.date);
         });

         for (var i = 0; i < data.length; i++) {
             dates.push(data[i].date);
             positive.push(data[i].positive_tweets);
             negative.push(data[i].negative_tweets);
             neutral.push(data[i].neutral_tweets);

         }

         //console.log(dates);
         var plotPositive = {
             x: dates,
             y: positive,
             type: 'bar',
             name: 'Positive',
             marker: {
                 color: SENTIMENT_COLOR_RANGE[2],
                 line: {
                     color: 'rgba(0,0,0,1.0)',
                     width: 1
                 }
             }
         };
         var plotNegative = {
             x: dates,
             y: negative,
             type: 'bar',
             name: 'Negative',
             marker: {
                 color: SENTIMENT_COLOR_RANGE[0],
                 line: {
                     color: 'rgba(0,0,0,1.0)',
                     width: 1
                 }
             }
         };
         var plotNeutral = {
             x: dates,
             y: neutral,
             type: 'bar',
             name: 'Neutral',
             marker: {
                 color: SENTIMENT_COLOR_RANGE[1],
                 line: {
                     color: 'rgba(0,0,0,1.0)',
                     width: 1
                 }
             }
         };


         //console.log(dates);

         var dataBarPlot = [plotPositive, plotNegative, plotNeutral];

         var layout = {
             title: 'Total Tweets comparison',
             barmode: 'group',
             width: 750,
         };


         Plotly.newPlot('barChart', dataBarPlot, layout);
     }

     function generateTimeLineGraph(data) {

         var dataLineGraph = [];

         for (var index = 0; index < data.length; index++) {
             dataLineGraph.push([new Date(data[index].date), data[index].total_tweets]);
         }
         //console.log(dataLineGraph);

         dataLineGraph.sort(function(d1, d2) {

             return new Date(d1[0]) - new Date(d2[0]);
         });
         //console.log(dataLineGraph);

         new Dygraph(
             document.getElementById("timeline"),
             dataLineGraph, {
                 title: 'Tweets Per Day',
                 drawPoints: true,
                 showRangeSelector: true,

                 legend: 'always',
                 labels: ['Days', 'Tweets'],
                 axes: {
                     x: {
                         axisLabelWidth: 30,
                         pixelsPerLabel: 30,
                         axisLabelFontSize: 10,

                         drawGrid: false,
                         drawAxis: true
                     }

                 }

             });

     }

     drawSummaryGraphs();
 });