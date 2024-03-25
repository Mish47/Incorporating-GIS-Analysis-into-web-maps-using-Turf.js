/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXM3MzIyIiwiYSI6ImNsc2liNzgyNjE3bHMyaW5uYmpnM2g0ZWUifQ.XnhfVeO7l6Smi0x-SKMB8Q'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/chris7322/clsjtr9s701fc01qre0wl846p',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 12 // starting zoom level
});

//Add search control to map overlay
//Requires plugin as source in HTML body
map.addControl(
    new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        countries: "ca" //Try searching for places inside and outside of canada to test the geocoder
    })
);

//Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

// Add fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable
let pointsgeojson;

// Fetch GeoJSON from URL
fetch('https://raw.githubusercontent.com/smith-lg/ggr472-lab4/main/data/pedcyc_collision_06-21.geojson')

.then(response => response.json())
.then(response => {
    console.log(response); 
    pointsgeojson = response; 
});

// Add Source
map.on('load', () => {
    map.addSource('cycle-data', {
        type: 'geojson', 
        data: pointsgeojson
    });

    // Add Layer & Make Points White Coloured
    map.addLayer({
        'id': 'cycle-pts',
        'type': 'circle', 
        'source': 'cycle-data', 
        'paint': {
          'circle-radius': ['/', ['get', 'capacity'], 0.2],
          'circle-color': '#FFFFFF'
        }
      });



/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function

    let bboxgeojson;

    // Turf Envelop Geojson
    let bbox = turf.envelope(pointsgeojson);

    bboxgeojson = {
        'type': 'FeatureCollection',
        'features': [bbox]
    };

    // Add Source
    map.addSource('collisons-bbox', {
        type: 'geojson', 
        data: bboxgeojson
    });

    // Add Layer & Make Colour White
    map.addLayer({
        'id': 'bounding-box-fill', 
        'type': 'line', 
        'source': 'collisons-bbox', 
        'paint': {
            'line-color': '#FFFFFF'
          }
    });


/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    // Bbox Coordinates
    let bboxcoords = [bbox.geometry.coordinates[0][0][0], 
                    bbox.geometry.coordinates[0][0][1], 
                    bbox.geometry.coordinates[0][2][0], 
                    bbox.geometry.coordinates[0][2][1]]
    
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, {units: 'kilometers'});

    // Add Hexgrid Source
    map.addSource('hexgrid', {
        type: 'geojson', 
        data: hexgeojson
    });


    // Turf Collect
    let collishex = turf.collect(hexgeojson, pointsgeojson, '_id', 'values');

    let maxcollis = 0;

    collishex.features.forEach((feature) => {
        
        feature.properties.COUNT = feature.properties.values.length;
        if (feature.properties.COUNT > maxcollis) {
            console.log(feature);
            
            maxcollis = feature.properties.COUNT
        }
    });


    // Add Source
    map.addSource('collis-hex', {
        type: 'geojson', 
        data: collishex
    });

    // Add Layer and Adjust Colour Accordingly using an Expression
    map.addLayer({
        'id': 'collishex-layer', 
        'type': 'fill', 
        'source': 'collis-hex',
        'paint' : {
            'fill-color': [
                // Colours depending on Variable
                'step', ['get', 'COUNT'], '#800026',
                    10, '#bd0026', 
                    15, '#e31a1c',
                    25, '#fc4e2a', 
                    30, '#fd8d3c'
                ],
            'fill-opacity': 0.5
        }
    });

})



// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


map.on('mouseenter', 'cycle-pts', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over cycle-pts layer
});

map.on('mouseleave', 'cycle-pts', () => {
    map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves cycle-pts layer
});

map.on('click', 'cycle-pts', (e) => {
    new mapboxgl.Popup() //Declare new popup object on each click
        .setLngLat(e.lngLat) //Use method to set coordinates of popup based on mouse click location
        .setHTML("<b>Injury Type:</b> " + e.features[0].properties.ACCLASS) //Use click event properties to write text for popup
        .addTo(map); //Show popup on map
});


