function themeriver(selector) {
    // Set up canvas
    var margin = {top: 20, bottom: 20, left: 40, right: 20};
    var padding = {top: 10, bottom: 10, left: 10, right: 10};
    var width = 800, height = 200;
    var graphWidth = width - margin.left - margin.right;
    var graphHeight = height - margin.top - margin.bottom;
    var colorScheme = ['#014636', '#016c59', '#02818a', '#3690c0', '#67a9cf', '#a6bddb', '#d0d1e6', '#ece2f0', '#fff7fb'];

    var canvas = d3v4.select(selector)
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height);

    // Dates
    var currentDateIdx = 0;    // Index to the current selected date.
    var availableDates = [];

    function getAvailableDates(data) {
        var dates = [];
        for (date in data) {
            dates.push(date);
        }

        dates.sort(function(date1, date2) {
            return new Date(date1) - new Date(date2);
        });
        return dates;
    }

    function getCurrentDate() {
        return availableDates[currentDateIdx];
    }

    function preprocess(data, dates) {
        /*
            Original format:  {'2017-04-15': {
                                    'hashtags_all_states': [{'text': '#something', 'size': 1000}]
                                    }
                                }
            Target format: [
                            {'date': '2017-04-15', '#something': 1000}
                            ]
        */
        var dataProcessed = [];
        var trendingWords = {};
        for (date in data) {
            var hashtags = data[date].hashtags_all_states;
            for (var i = 0; i < 3 && i < hashtags.length; i++) {
                trendingWords[hashtags[i].text] = 0;
            }
        }
        dates.forEach(function(date) {
            var d = {'date': date};
            var hashtags = data[date].hashtags_all_states;
            var hashtagsMap = {};
            for (var i = 0; i < data[date].hashtags_all_states.length; i++) {
                hashtagsMap[hashtags[i].text] = hashtags[i].size;
            }
            for (word in trendingWords) {
                if (word in hashtagsMap) {
                    d[word] = hashtagsMap[word];
                } else {
                    d[word] = 0;
                }
            }
            dataProcessed.push(d);
        });
        
        return dataProcessed;
    }

    function update(data, dateIdx, renderData) {
        // Remove old graph.
        canvas.selectAll('g').remove();
        // Preprocessing.
        var originalData = data;
        availableDates = getAvailableDates(data);
        currentDateIdx = dateIdx;
        data = preprocess(data, availableDates);

        if (data.length == 0) {
            return;
        }
        // Initial setup.
        var timeLabel = 'date';
        var maxTotal = 0;
        var keys = [];
        // Get all categories.
        for (k in data[0]) {
            if (k != timeLabel) {
                keys.push(k);
            }
        }

        // Find out the max total value.
        for (var i = 0; i < data.length; i++) {
            var total = 0;
            var time = data[i][timeLabel];
            for (var j = 0; j < keys.length; j++) {
                var type = keys[j];
                if (data[i][type] != '') {
                    total += parseFloat(data[i][type]);
                }
            }
            maxTotal = Math.max(maxTotal, total);
        }

        // Main graph variables.
        var stack = d3v4.stack().offset(d3v4.stackOffsetSilhouette).keys(keys)(data);
        var xScale = d3v4.scaleBand().range([margin.left, graphWidth + margin.left]).domain(availableDates);
        var yScale = d3v4.scaleLinear().range([graphHeight + margin.top, margin.top]).domain([-maxTotal/2, maxTotal/2]);
        var yAxisScale = d3v4.scaleLinear().range([graphHeight + margin.top, margin.top]).domain([0, maxTotal]);
        var colorScale = d3v4.scaleOrdinal(ORDINAL_COLORS);
        var xAxis = d3v4.axisBottom(xScale);
        var yAxis = d3v4.axisLeft(yAxisScale).ticks(1);
        var tooltip = d3v4.select(selector + ' > div.mytooltip');

        var vBar = d3v4.select(selector + ' > div.vBar');

        var xToTimeIdx = function(x) {
            // x is the x coordinate and d is all the time steps.
            return Math.min(availableDates.length - 1, Math.max(0, Math.floor(availableDates.length * (x - xScale(availableDates[0])) / graphWidth)));
        }

        // Maximum value of any category.
        var maxV = 0;
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < keys.length; j++) {
                if (data[i][keys[j]] != '') {
                    maxV = Math.max(maxV, parseFloat(data[i][keys[j]]));
                }
            }
        }

        // Append ThemeRiver graph.
        canvas.selectAll('g')
            .data(stack)
            .enter()
            .append('g')
            .attr('fill', function(d) {return colorScale(d.key);})
            .append('path')
            .attr('class', 'path')
            .attr('d', d3v4.area()
                        .curve(d3v4.curveCardinal)
                        .x(function(d) {return xScale(d.data[timeLabel]) + xScale.bandwidth() / 2;})
                        .y0(function(d) {return yScale(parseFloat(d[1]));})
                        .y1(function(d) {return yScale(parseFloat(d[0]));}));

        // Append axis.
        canvas.append('g')
            .attr('transform', 'translate(0,' + (graphHeight + margin.top) + ')')
            .attr('class', 'axis')
            .call(xAxis);
        canvas.append('g')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .attr('class', 'axis')
            .call(yAxis);

        // Hovering on a path.
        canvas.selectAll('.path')
            .on('mouseover', function(d, i) {
                canvas.selectAll('.path')
                    .attr('opacity', function(d, j) {
                        if (i === j) {
                            return 1;
                        } else {
                            return 0.5;
                        }
                    });
                var mX = d3v4.mouse(this)[0];
                var timeIdx = xToTimeIdx(mX);
                
            })
            .on('mouseout', function() {
                canvas.selectAll('.path')
                    .attr('opacity', 1);
                tooltip.style('display', 'none');
                //vBar.style('display', 'none');
            })
            .on('mousemove', function(d, i) {
                var mX = d3v4.mouse(this)[0], mY = d3v4.mouse(this)[1];
                var timeIdx = xToTimeIdx(mX);
                tooltip.select('p')
                        .text(keys[i] + ', ' + availableDates[timeIdx] + ', ' + (d[timeIdx][1] - d[timeIdx][0]));
                tooltip.style('left', (margin.left * 1.5) + 'px')
                    .style('top', margin.top + 'px')
                    .style('display', 'block');

            });

        canvas
            .on("mousemove", function() {
                var mX = d3v4.mouse(this)[0];
                var timeIdx = xToTimeIdx(mX);
                if (timeIdx != currentDateIdx) {
                    currentDateIdx = timeIdx;
                    renderData(originalData[availableDates[currentDateIdx]]);
                }
                vBar.style('left', (mX + 10) + 'px')
                    .style('top', '0px')
                    .style('height', height + 'px')
                    .style('display', 'block');
            })
            .on("mouseover", function(){
                var mX = d3v4.mouse(this)[0];
                var timeIdx = xToTimeIdx(mX);
                if (timeIdx != currentDateIdx) {
                    currentDateIdx = timeIdx;
                    renderData(originalData[availableDates[currentDateIdx]]);
                }
                vBar.style('left', (mX + 10) + 'px')
                    .style('top', '0px')
                    .style('height', height + 'px')
                    .style('display', 'block');
            });
    };

    return {
        update: update,
        availableDates: availableDates,
        currentDateIdx: currentDateIdx,
        getCurrentDate: getCurrentDate
    };
}



