/**
 * Creates a D3.js ground track map.
 *
 * @param {string} containerSelector - CSS selector for the container div.
 * @param {string} tleLine1 - First line of the TLE.
 * @param {string} tleLine2 - Second line of the TLE.
 * @param {string} mapDataUrl - URL to fetch TopoJSON/GeoJSON world map data.
 * @param {number} width - Desired width of the map SVG.
 * @param {number} height - Desired height of the map SVG.
 */
async function createGroundTrackMap(containerSelector, tleLine1, tleLine2, mapDataUrl, width, height) {
    const container = d3.select(containerSelector);
    if (container.empty()) {
        console.error(`Container element not found: ${containerSelector}`);
        return;
    }

    container.selectAll("svg").remove(); // Clear previous map if any

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`) // Make it responsive
        .style("background-color", "rgba('30,30,30,0.5')"); // Dark background for map area

    // --- Projection Setup ---
    const projection = d3.geoEquirectangular() // Simple cylindrical projection
        .scale(width / (2 * Math.PI) * 0.95) // Adjust scale to fit width
        .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    // --- Draw Graticule (Map Grid Lines) ---
    const graticule = d3.geoGraticule10(); // 10-degree grid lines
     svg.append("path")
         .datum(graticule)
         .attr("class", "graticule")
         .attr("d", pathGenerator);

    // --- Load and Draw World Map ---
    try {
        const world = await d3.json(mapDataUrl);
        const landFeatures = topojson.feature(world, world.objects.countries); // Adjust object name if needed (e.g., 'land')

        svg.append("g")
            .selectAll(".land")
            .data(landFeatures.features)
            .join("path")
            .attr("class", "land")
            .attr("d", pathGenerator);

    } catch (error) {
        console.error("Error loading or drawing map data:", error);
        svg.append("text") // Display error on map
           .attr('x', width / 2)
           .attr('y', height / 2)
           .attr('text-anchor', 'middle')
           .attr('class', 'info-text')
           .text("Error loading map data");
        return; // Stop if map fails to load
    }


    // --- Satellite Propagation ---
    let satrec;
    try {
        satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    } catch (e) {
        console.error("Error parsing TLE:", e);
        svg.append("text")
           .attr('x', width / 2)
           .attr('y', height / 2)
           .attr('text-anchor', 'middle')
           .attr('class', 'info-text')
           .text("Error parsing TLE data");
        return;
    }

    // Calculate orbital period
    const periodMinutes = 90; // Period in minutes
    const periodMillis = periodMinutes * 60 * 1000;
    console.log("Orbital Period (minutes):", periodMinutes);


    // Calculate time range: -1 to +3 orbits from now
    // const now = new Date(); // Current time reference
    const now = Cesium.JulianDate.toDate(viewer.clockViewModel.currentTime); //Current simulator time
    const nowMillis = now.getTime();
    const startTime = new Date(nowMillis - periodMillis * 1);
    const endTime = new Date(nowMillis + periodMillis * 3);
    const timeStepMillis = 60 * 1000; // Calculate position every 60 seconds

    const groundTrackPoints = [];

    // Propagate satellite positions
    for (let timeMillis = startTime.getTime(); timeMillis <= endTime.getTime(); timeMillis += timeStepMillis) {
        const time = new Date(timeMillis);
        try {
            const positionAndVelocity = satellite.propagate(satrec, time);
            if (!positionAndVelocity || !positionAndVelocity.position) continue; // Skip if propagation fails

            const gmst = satellite.gstime(time);
            const positionEci = positionAndVelocity.position;
            const positionGd = satellite.eciToGeodetic(positionEci, gmst); // Get Lat/Lon in Radians

            // Convert radians to degrees and store [longitude, latitude]
            const longitude = satellite.degreesLong(positionGd.longitude);
            const latitude = satellite.degreesLat(positionGd.latitude);

            // Basic handling for anti-meridian crossing (visual only)
            // If longitude jump is too large, add null to break the line segment in D3
            if (groundTrackPoints.length > 0) {
                const prevLon = groundTrackPoints[groundTrackPoints.length - 1][0];
                if (Math.abs(longitude - prevLon) > 180) { // Arbitrary threshold for jump
                   // console.log("Anti-meridian crossing detected");
                   // groundTrackPoints.push(null); // Causes d3.line to break, use separate paths or GeoJSON multi-line
                }
            }
            groundTrackPoints.push([longitude, latitude]);

        } catch (propError) {
            // Ignore occasional propagation errors at edge cases?
            // console.warn("Propagation error at time:", time, propError);
        }
    }

     // --- Draw Ground Track ---
     // Format points as GeoJSON LineString for d3.geoPath
     const trackGeoJson = {
         type: "LineString",
         coordinates: groundTrackPoints.filter(p => p !== null) // Ensure no nulls if breaking line
     };

     svg.append("path")
         .datum(trackGeoJson)
         .attr("class", "ground-track")
         .attr("d", pathGenerator); // Use the same path generator


    // --- Calculate and Draw Current Position Marker ---
    try {
        const currentPositionAndVelocity = satellite.propagate(satrec, now); // Propagate to *now*
        if (currentPositionAndVelocity && currentPositionAndVelocity.position) {
            const currentGmst = satellite.gstime(now);
            const currentPositionEci = currentPositionAndVelocity.position;
            const currentPositionGd = satellite.eciToGeodetic(currentPositionEci, currentGmst);

            const currentLongitude = satellite.degreesLong(currentPositionGd.longitude);
            const currentLatitude = satellite.degreesLat(currentPositionGd.latitude);

            const currentCoords = projection([currentLongitude, currentLatitude]);

            if (currentCoords) { // Check if projection is valid
                svg.append("circle")
                    .attr("class", "satellite-marker")
                    .attr("cx", currentCoords[0])
                    .attr("cy", currentCoords[1])
                    .attr("r", 5); // Radius of the marker
            } else {
                 console.warn("Could not project current satellite position onto map.");
            }
        } else {
            console.warn("Could not calculate current satellite position.");
             svg.append("text")
               .attr('x', 10)
               .attr('y', height - 10)
               .attr('class', 'info-text')
               .text("Could not plot current position");
        }
    } catch (currentPosError) {
         console.error("Error calculating current position:", currentPosError);
          svg.append("text")
               .attr('x', 10)
               .attr('y', height - 10)
               .attr('class', 'info-text')
               .text("Error plotting current position");
    }

     // Add Timestamp
      svg.append("text")
          .attr('x', width - 10)
          .attr('y', height - 10)
          .attr('text-anchor', 'end')
          .attr('class', 'info-text')
          .text(`Track Generated: ${now.toLocaleString()}`);


} // End of createGroundTrackMap function