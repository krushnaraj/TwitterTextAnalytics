function drawLegend() {
	/** based from http://bl.ocks.org/nbremer/62cf60e116ae821c06602793d265eaf6 **/
	// var SENTIMENT_DOMAIN = [0, 1.8, 2, 2.2, 4];
	// var SENTIMENT_COLOR_RANGE = ["#FF0000", "#e06c00", "#ffff00", "#00ffff", "#0000ff"];

  	//Extra scale since the color scale is interpolated
	var countScale = d3.scale.linear()
		.domain([0, 4])
		.range([0, 500]);

    // Color scale.
    var colorScale = d3.scale.linear()
                      .domain(SENTIMENT_DOMAIN)
                      .range(SENTIMENT_COLOR_RANGE);

	//Calculate the variables for the temp gradient
	var numStops = 5;
	countRange = countScale.domain();
	countRange[2] = countRange[1] - countRange[0];
	countPoint = [];
	for(var i = 0; i < numStops; i++) {
		countPoint.push(i * countRange[2]/(numStops-1) + countRange[0]);
	}//for i
	var legendWidth = 500;

	var svg = d3.select("#legend").append("svg").attr("width", 1000).attr("height", 35);
	//Create the gradient
	svg.append("defs")
		.append("linearGradient")
		.attr("id", "legend-color")
		.attr("x1", "0%").attr("y1", "0%")
		.attr("x2", "100%").attr("y2", "0%")
		.selectAll("stop") 
		.data(d3.range(numStops))                
		.enter().append("stop") 
		.attr("offset", function(d,i) { 
			return countScale( countPoint[i] )/legendWidth;
		})   
		.attr("stop-color", function(d,i) { 
			return colorScale( countPoint[i] ); 
		});

	///////////////////////////////////////////////////////////////////////////
	////////////////////////// Draw the legend ////////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	//Color Legend container
	var legendsvg = svg.append("g")
		.attr("class", "legendWrapper")
		.attr("transform", "translate(" + ((legendWidth/2) + 200) + "," + 0 + ")");

	//Draw the Rectangle
	legendsvg.append("rect")
		.attr("class", "legendRect")
		.attr("x", CIRCLE_LEGEND_WIDTH / 4 + -legendWidth/2)
		.attr("y", 0)
		//.attr("rx", hexRadius*1.25/2)
		.attr("width", legendWidth)
		.attr("height", 12)
		.style("fill", "url(#legend-color)");
	
	// Append title
	legendsvg.append("text")
		.attr("class", "legendTitle")
		.attr("x", CIRCLE_LEGEND_WIDTH / 4 + legendWidth/2)
		.attr("y", 25)
		.style("text-anchor", "middle")
		.text("Extremely Positive");

	legendsvg.append("text")
		.attr("class", "legendTitle")
		.attr("x", CIRCLE_LEGEND_WIDTH / 4)
		.attr("y", 25)
		.style("text-anchor", "middle")
		.text("Neutral");

	legendsvg.append("text")
		.attr("class", "legendTitle")
		.attr("x", CIRCLE_LEGEND_WIDTH / 4+ -legendWidth/2)
		.attr("y", 25)
		.style("text-anchor", "middle")
		.text("Extremely Negative");
}