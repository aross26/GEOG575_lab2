//place script in anon function
(function(){    
    
//sudo-global variables
// data join array
var attrArray = ["National_Battlefield", "National_Historic_Site", "National_Preserve", "National_Monument", "National_Park", "National_Recreation_Area"];
    
var expressed = attrArray[0]; // initial attr
    
// chart dimensions
var chartWidth = window.innerWidth * 0.45,
    chartHeight = 650,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

// create scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([650, 0])
    .domain([0, 100]);
    
// start script when window loads
window.onload = setMap();
    
// set up choropleth map
function setMap(){
    
	// map frame dimensions
	var width = window.innerWidth * 0.5,
		height = 650;
    
    // create new svg container for the map
	var map = d3.select("body")
		.append("svg")
		.attr("class", "map")
		.attr("width", width)
		.attr("height", height);

	// create Albers projection
	var projection = d3.geoAlbers()
		.center([0, 50])
		.rotate([100, 0])
		.parallels([45, 45.5])
		.scale(500)
		.translate([width / 2, height / 2]);

	var path = d3.geoPath()
		.projection(projection);
    
    // use queue 
    d3.queue()
        .defer(d3.csv, "data/npsAreaPerState.csv") //load csv
        .defer(d3.json, "data/stateOutlines.topojson") //load spatial data
        .await(callback);

    function callback(error, csvData, us_states){
        
        // translate topoJSON to geoJSON
        var usStates = topojson.feature(us_states, us_states.objects.states).features;   
        
        // join csvData to geoJSON states
        states = joinData(usStates, csvData);
        
        // create color scale
        var colorScale = makeColorScale(csvData);
        
        // add states to the map
        setStates(usStates, map, path, colorScale);
        
        // add bar chart to page
        setChart(csvData, colorScale);
        
        // add dropdown
        createDropdown();
    };
}; // end setMap
    
function joinData(usStates, csvData){
    
    //loop through csv to assign each set of csv attribute values to geojson state
        for (var i=0; i<csvData.length; i++){
            var csvNPS = csvData[i];
            var csvKey = csvNPS.Name;

            //loop through states to find correct one
            for (var a=0; a<usStates.length; a++){

                var geojsonProps = usStates[a].properties; //the current NPS unit geojson properties
                var geojsonKey = geojsonProps.name; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvNPS[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
        };        
    return usStates;
}; // end joinData

// function to make color scale generator
function makeColorScale(data){
    var colorClasses = [
    "#D4B9DA",
    "#C994C7",
    "#DF65B0",
    "#DD1C77",
    "#980043"
    ];
    
    // scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);
    
    // build array of values in expressed attr
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    
    // cluster data using ckmeans algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    
    // reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    
    // rm first val from domain array to create class breakpoints
    domainArray.shift();

    // assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
}; //end makeColorScale
    
// function to test for data value and return color
function choropleth(props, colorScale){
    // test that attr val is number
    var val = parseFloat(props[expressed]);
    // if attr val exists, assign a color; else set as gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
}; // end choropleth
        
function setStates(usStates, map, path, colorScale){
    var states = map.selectAll(".states")
		.data(usStates)
		.enter()
		.append("path")
		.attr("class", function(d){
			return "states " + d.properties.name;
		})
		.attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        });
    console.log(states);
}; // end setStates

// set up bar chart
function setChart(csvData, colorScale){
    // create new svg for bar chart
    var chart = d3.select("body")
        .append("svg")
          .attr("width", chartWidth)
          .attr("height", chartHeight)
          .attr("radius", Math.min(chartInnerWidth, chartInnerHeight) / 2)
        .attr("class", "chart")
        .append("g")
          .attr("transform", "translate(" + chartInnerWidth / 2 + "," + chartInnerHeight / 2 + ")");
    
    var color = colorScale(csvData);
    
    // calc position of each pie group
    var pie = d3.pie()
        //.sort(function(a, b){
            //return b[expressed]-a[expressed]
        //})
        .sort(null)
        .attr("class", function(d){
            return "pie " + d.Name;
        })
        .value(function(d) {return d.value; })
     var path = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(radius - 70);

    var label = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);
    
    for (var i=0; i<csvData.length; i++){
            var csvNPS = csvData[i];
            var csvKey = csvNPS.Name;
        
    csvData(function(d) {
        d.population = +d.population;
        return d;
    }, function(error, data) {
        if (error) throw error;

    var arc = g.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
          .attr("class", "arc");

    arc.append("path")
        .attr("d", path)
        .attr("fill", function(d) { return color(d.data.age); });

    arc.append("text")
        .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
        .attr("dy", "0.35em")
        .text(function(d) { return d.data.Name; });
    });
}; // end setChart
    
// create dropdown menu to select attribute to display
function createDropdown(csvData){
    // add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    // add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    // add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
}; // end createDropdown
    

    
})();