function build_schedule(container_id, groundstations, pass_data, options, ) {

    // DOM element where the Timeline will be attached
    var container = document.getElementById(container_id);

    function findObjectById(array, name) {
        const found = array.find(obj => obj.content === name);
        return found.id;
    }

    var i = 1;
    stations = [];
    groundstations.forEach(station => {
        stations.push({
            id: i,
            content:station.abbreviation
        });
        i += 1;
    });
    //Create Group
    var group = new vis.DataSet(stations);

    //Add Passes
    var j = 100;
    passes = [];
    pass_data.forEach(pass => {
        passes.push({
            id: j,
            editable: false,
            content: "Max El:" + pass.maxElevation +"°</p>",
            start:new Date(pass.start),
            end:new Date(pass.end),
            group:findObjectById(stations,pass.site)
        });
        j += 1;
    });
    var items = new vis.DataSet(passes);

    // specify options
    var options = {
        showCurrentTime: true,
        start: dayjs().subtract(30,'minutes').toDate(),
        end: dayjs().add(4,'hours').toDate()
    }

    // Create a Timeline
    var timeline = new vis.Timeline(container_id, items, group, options);

    return timeline;
    
}