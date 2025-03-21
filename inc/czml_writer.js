function groundStationPacket(
    groundstationName,
    groundStationPosition,
    groundStationDescription="<p>Generic Ground Station Information</p>")
{
    pkt.name = grroundstationName;

    return pkt;
}

function plotSitesFromJson(jsonData, viewer) {
    try {

        sites = {};
        if(typeof jsonData === 'string'){
            sites = JSON.parse(jsonData);
        } else {
            sites = jsonData;
        }
        console.log(sites);

        if (!Array.isArray(sites)) {
            throw new Error("JSON data must be an array of site objects.");
        }

        for (const site of sites) {
            // Validate the structure of each site object
            if (
                typeof site !== 'object' ||
                typeof site.name !== 'string' ||
                typeof site.abbreviation !== 'string' ||
                typeof site.site !== 'object' ||
                typeof site.site.latitude !== 'number' ||
                typeof site.site.longitude !== 'number' ||
                typeof site.site.height !== 'number'
            ) {
                console.warn("Skipping invalid site object:", site);
                continue; // Skip to the next site if the current one is invalid
            }

            // Convert latitude and longitude from degrees to radians
            const longitude = Cesium.Math.toRadians(site.site.longitude);
            const latitude = Cesium.Math.toRadians(site.site.latitude);
            const height = site.site.height;

            // Create a point entity for each site
            viewer.entities.add({
                name: site.name, // Use the site's name as the entity's name
                position: Cesium.Cartesian3.fromDegrees(site.site.longitude, site.site.latitude, height),
                // point: {
                //     pixelSize: 10,
                //     color: Cesium.Color.BLUE, // Choose a color for the points
                //     outlineColor: Cesium.Color.WHITE,
                //     outlineWidth: 2,
                // },
                billboard: {
                    image:
                      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACvSURBVDhPrZDRDcMgDAU9GqN0lIzijw6SUbJJygUeNQgSqepJTyHG91LVVpwDdfxM3T9TSl1EXZvDwii471fivK73cBFFQNTT/d2KoGpfGOpSIkhUpgUMxq9DFEsWv4IXhlyCnhBFnZcFEEuYqbiUlNwWgMTdrZ3JbQFoEVG53rd8ztG9aPJMnBUQf/VFraBJeWnLS0RfjbKyLJA8FkT5seDYS1Qwyv8t0B/5C2ZmH2/eTGNNBgMmAAAAAElFTkSuQmCC",
                    scale: 1.5,
                  },
                label: { // Add a label for the site abbreviation
                    text: site.abbreviation,
                    font: '14px sans-serif',
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    outlineWidth: 2,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // Position the label above the point
                    pixelOffset: new Cesium.Cartesian2(0, -10), // Offset the label slightly
                    // disableDepthTestDistance: Number.POSITIVE_INFINITY, //prevent label dissapear when behind objects.
                },
                description: `
                    <h1>${site.name} (${site.abbreviation})</h1>
                    <p>Latitude: ${site.site.latitude}°</p>
                    <p>Longitude: ${site.site.longitude}°</p>
                    <p>Altitude (height): ${site.site.height} m</p>
                `,
            });
        }
    } catch (error) {
        console.error("Error plotting sites from JSON:", error);
        // Optionally, display an error message to the user in the UI
        const errorDisplay = document.getElementById('errorDisplay'); // Assuming you have an errorDisplay div
        if (errorDisplay) {
          errorDisplay.textContent = "Error processing site data: " + error.message;
        }

    }
}