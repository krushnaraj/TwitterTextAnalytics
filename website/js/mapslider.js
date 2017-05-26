// Slider for choosing a date.
function mapslider() {

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

    // Initialize the slider.
    function update(data, v, renderData) {
        availableDates = getAvailableDates(data);
        currentDateIdx = v;

        if (typeof $("#slider").slider("instance") != 'undefined') {
            $("#slider").slider("destroy");
        }
        $("#slider").slider({
            value: v,
            min: 0,
            max: availableDates.length - 1,
            change: function (event, ui) {
                $("#selectedDate").text(availableDates[$("#slider").slider("value")]);
                currentDateIdx = ui.value;
                renderData(data[availableDates[currentDateIdx]]);
            }
        });
        $("#selectedDate").text(availableDates[$("#slider").slider("value")]);
    }

    return {
        update: update,
        availableDates: availableDates,
        currentDateIdx: currentDateIdx,
        getCurrentDate: getCurrentDate
    };
}