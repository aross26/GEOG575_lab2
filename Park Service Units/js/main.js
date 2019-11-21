//place script in anon function
(function(){    
    
//sudo-global variables
// data join array
var attrArray = ["National Battlefield", "National Historic Site", "National Preserve", "National Monument", "National Park", "National Recreation Area"];
    
    
var expressed = attrArray[0]; // initial attr
    
    
// chart dimensions
var chartWidth = window.innerWidth * 0.45,
    chartHeight = 650,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")",
    chart;   
    
    
// start script when window loads
window.onload = setMap();
    
    
// set up choropleth map
function setMap(){
    
	// map frame dimensions
	var width = window.innerWidth * 0.7,
		height = 650;
    
    // create new svg container for the map
	var map = d3.select("body")
		.append("svg")
		.attr("class", "map")
		.attr("width", width)
		.attr("height", height);
    
    // make svg container for chart
    
    
    
    
    
	// create Albers projection
	var projection = d3.geoAlbers()
		.center([0, 50])
		.rotate([100, 0])
		.parallels([45, 45.3])
		.scale(450)
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
        var states = joinData(usStates, csvData);
        
        // create color scale
        var colorScale = makeColorScale(csvData);
        
        // add dropdown
        createDropdown(csvData);
        
        // add states to the map
        setStates(usStates, map, path, colorScale);
        
        // add pie chart
        makeChart(csvData, colorScale);
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
    "#ffffcc",
    "#c2e699",
    "#78c679",
    "#31a354",
    "#006837"
    ];
    
    // create scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    
    // build array of values in expressed attr
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    // assign array of expressed values as scale domain
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
        return "#ddd";
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
}; // end setStates
    
    
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


// event listener to update map and chart when attr is picked    
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;   

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    
    makeChart(csvData, colorScale);   
    
}; //end changeAttribute
    
    
// set up pie chart
function makeChart(csvData, colorScale){ 
    
    var chartMargin = 40,
    radius = Math.min(chartWidth, chartHeight) /2 - chartMargin;
    
    // build array of values in expressed attr
    var chartArray = [];
    for (var i=0; i<csvData.length; i++){
        var val = parseFloat(csvData[i][expressed]);
        chartArray.push(val);
    };  
    
    // chloropleth color function (doesn't work with props[expressed], so remade here)
    function chartopleth(props, colorScale){
        // test that attr val is number
        var val = parseFloat(props);
        // if attr val exists, assign a color; else set as gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#000";
        };
    }; // end 
    
    // calc position of each pie slice
    var pie = d3.pie()
        .value(function(d) {return d.value; })
    var data_ready = pie(d3.entries(chartArray));

    console.log(data_ready);
    
    var chart = d3.select("body")
    .append("svg")
    .attr("width", chartInnerWidth)
    .attr("height", chartInnerHeight)
    .attr("class", "chart")
    .append("g")
      .attr("transform", "translate(" + chartWidth / 2 + "," + chartHeight / 2 + ")");

    // map chart to data
        var m = chart.selectAll(".pie")
        .data(data_ready)
        .enter()
        .append("path")
        .transition()
        .duration(1000)
        .attr('d', d3.arc()
             .innerRadius(radius * 0.4)
             .outerRadius(radius)
         )
        .attr('fill', function(d){
            return chartopleth(d.value, colorScale) })        
        .attr("stroke", "white")
        .style("stroke-width", "1.5px")
        .style("opacity", 1)

    
}; // end makeChart

    
})();