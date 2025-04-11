function build_schedule(container_id, groundstations, pass_data, options, ) {

    // DOM element where the Timeline will be attached
    var container = document.getElementById(container_id);
    // var container_width = window.getComputedStyle(container).getPropertyValue('width');

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

/**
 * Sorts an array of pass objects in place by their 'start' timestamp (ascending).
 *
 * @param {Array<Object>} passesArray The array of pass objects.
 * Each object is expected to have a 'start' property
 * containing a numerical timestamp (like milliseconds since epoch).
 * @returns {Array<Object>} The original array, now sorted by the 'start' property.
 * Returns the original input if it's not a valid array.
 */
function sortPassesByStartTime(passesArray) {
    // 1. Validate Input: Check if the input is actually an array.
    if (!Array.isArray(passesArray)) {
      console.error("Error: Input provided is not an array.");
      return passesArray; // Return the original input or handle as needed
    }
  
    // 2. Sort the Array: Use the built-in sort method with a custom compare function.
    //    The sort method modifies the array in place.
    passesArray.sort((passA, passB) => {
      // Compare function:
      // - Returns negative if passA.start comes before passB.start
      // - Returns positive if passA.start comes after passB.start
      // - Returns 0 if they are equal (relative order might not be guaranteed depending on JS engine)
  
      // Optional: Add checks for valid 'start' properties if needed
      if (typeof passA?.start !== 'number' || typeof passB?.start !== 'number') {
         console.warn("Warning: Found pass object with invalid or missing 'start' property during sort.");
         // Decide how to handle invalid entries, e.g., treat them as equal or push to end
         if (typeof passA?.start !== 'number' && typeof passB?.start !== 'number') return 0;
         if (typeof passA?.start !== 'number') return 1; // Put invalid 'a' later
         if (typeof passB?.start !== 'number') return -1; // Put invalid 'b' later
      }
  
      return passA.start - passB.start;
    });
  
    // 3. Return the sorted array (which is the same array instance passed in).
    return passesArray;
}
