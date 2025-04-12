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

// --- Variable to hold the interval ID ---
let countdownIntervalId = null;

/**
 * Formats a time difference in milliseconds into HH:MM:SS string.
 * @param {number} ms - Time difference in milliseconds.
 * @returns {string} Formatted time string (HH:MM:SS) or "Started".
 */
function formatTimeDifference(ms) {
    if (ms <= 0) {
        return "Started"; // Or "Passing"
    }

    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    // Pad with leading zeros
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
}

/**
 * Updates the countdown timers in the display box.
 */
function updateCountdowns() {
    const nowMillis = new Date().getTime();
    const countdownElements = document.querySelectorAll('#pass-display-content .pass-countdown');

    countdownElements.forEach(span => {
        const startTimeMillis = parseInt(span.dataset.startTime, 10); // Get start time from data attribute

        if (!isNaN(startTimeMillis)) {
            const diffMillis = startTimeMillis - nowMillis;
            span.textContent = formatTimeDifference(diffMillis);

            // Optional: Change style or text when pass starts
            if (diffMillis <= 0) {
                    span.classList.add('pass-started'); // Add class for styling
                    // Maybe remove the data attribute to stop updating this specific timer
                    // delete span.dataset.startTime;
            } else {
                    span.classList.remove('pass-started'); // Ensure class is removed if time resets
            }
        }
    });
}

/**
 * Displays upcoming passes in the HTML display box.
 * @param {Array<Object>} sortedPasses - Array of pass objects, pre-sorted by start time.
 * @param {number} maxPassesToShow - Maximum number of upcoming passes to display.
 */
function displayUpcomingPasses(sortedPasses, maxPassesToShow = 10) {
    const displayContent = document.getElementById('pass-display-content');
    if (!displayContent) {
        console.error("Pass display content element not found!");
        return;
    }

    displayContent.innerHTML = ''; // Clear previous content
    const nowMillis = new Date().getTime();
    let passesDisplayed = 0;

    for (const pass of sortedPasses) {
        // Check if the pass end time is in the future (or start time for upcoming)
        if (pass.start > nowMillis && passesDisplayed < maxPassesToShow) {

                // Validate data needed for display
                if (typeof pass.site !== 'string' || typeof pass.start !== 'number') {
                    console.warn("Skipping pass with invalid site or start time:", pass);
                    continue;
                }


            const passEntryDiv = document.createElement('div');
            passEntryDiv.className = 'pass-entry';

            const siteSpan = document.createElement('span');
            siteSpan.className = 'pass-site';
            siteSpan.textContent = pass.site; // Display site abbreviation

            const countdownSpan = document.createElement('span');
            countdownSpan.className = 'pass-countdown';
            // Store the start time on the element for the update function
            countdownSpan.dataset.startTime = pass.start;

            // Calculate and set initial countdown text
            const initialDiffMillis = pass.start - nowMillis;
            countdownSpan.textContent = formatTimeDifference(initialDiffMillis);

            passEntryDiv.appendChild(siteSpan);
            passEntryDiv.appendChild(countdownSpan);
            displayContent.appendChild(passEntryDiv);

            passesDisplayed++;
        }
    }

    if (passesDisplayed === 0) {
        displayContent.textContent = "No upcoming passes found.";
    }

    // --- Start or restart the update interval ---
    if (countdownIntervalId !== null) {
        clearInterval(countdownIntervalId); // Clear existing interval if any
    }
    // Only start interval if there are passes to count down
    if (passesDisplayed > 0) {
        updateCountdowns(); // Run once immediately to show correct initial times
        countdownIntervalId = setInterval(updateCountdowns, 1000); // Update every second
    } else {
        countdownIntervalId = null; // No need for an interval if nothing is displayed
    }

}

/**
 * Finds the next upcoming pass from a sorted array of pass objects.
 * Assumes the input array is already sorted by the 'start' property (ascending).
 *
 * @param {Array<Object>} sortedPassesArray The pre-sorted array of pass objects.
 * Each object needs a 'start' property (numeric timestamp in milliseconds).
 * @returns {Object|null} The pass object for the next upcoming pass,
 * or null if no future passes are found in the array.
 */
function getNextUpcomingPass(sortedPassesArray) {
    // 1. Validate Input
    if (!Array.isArray(sortedPassesArray)) {
      console.error("Error: Input must be a sorted array.");
      return null;
    }
  
    // 2. Get Current Time (in milliseconds since epoch)
    const nowMillis = new Date().getTime();
    // console.log(`Current Time (ms): ${nowMillis} (${new Date().toLocaleString()})`); // For debugging
  
    // 3. Iterate through the sorted passes
    for (const pass of sortedPassesArray) {
      // Basic check for a valid 'start' property
      if (typeof pass?.start !== 'number') {
        console.warn("Skipping pass object with invalid or missing 'start' property:", pass);
        continue; // Skip to the next pass object
      }
  
      // Since the array is sorted, the first pass with a start time
      // greater than the current time is the next upcoming one.
      if (pass.start > nowMillis) {
        // console.log(`Found next pass starting at ${pass.start} (${new Date(pass.start).toLocaleString()})`); // For debugging
        return pass; // Return the entire pass object
      }
    }
  
    // 4. If the loop finishes, no upcoming passes were found
    // console.log("No upcoming passes found in the list."); // For debugging
    return null;
  }  