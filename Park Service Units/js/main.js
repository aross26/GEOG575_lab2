//place script in anon function
(function(){    
    
//sudo-global variables
// data join array
var attrArray = ["National Battlefield", "National Historic Site", "National Preserve", "National Monument", "National Park", "National Recreation Area"];
    
    
var expressed = attrArray[0]; // initial attr
    
    
// chart dimensions
var chartWidth = window.innerWidth * 0.35,
    chartHeight = 650,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")",
    chart;   
    
// make svg container for chart
var chart = d3.select("body")
    .append("svg")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("class", "chart")
    .append("g")
      .attr("transform", "translate(" + chartWidth / 2 + "," + chartHeight / 2 + ")");  
    
    
// start script when window loads
window.onload = setMap();
    
    
// set up choropleth map
function setMap(){
    
	// map frame dimensions
	var width = window.innerWidth * 0.6,
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
        createDropdown(csvData, map);
        
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
    
function setTitle(map, data) {
    //create a text element for the map title
    var chartTitle = map.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Square miles of " + data + " per state");
}
    
function updateTitle(data){
    var chartTitle = d3.select(".chartTitle")
        .text("Square miles of " + data + " per state");
}
        
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
            return choropleth(d.properties, colorScale)}
        )
        .on("mouseover", function(d){
            highlight(d.properties)})
        .on("mouseout", function(d){
            dehighlight(d.properties)})
        .on("mousemove", moveLabel);
            
        var desc = states.append("desc")
        .text('{"stroke": "#bbac", "stroke-width": "2px", "opacity": "1"}');
    
        setTitle(map, expressed);
    }; // end setStates
    
    
// create dropdown menu to select attribute to display
function createDropdown(csvData, map){
    // add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData, map)
        });

    // add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select National Park Service Unit");

    // add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
}; // end createDropdown


// event listener to update map and chart when attr is picked    
function changeAttribute(attribute, csvData, map){
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
    updateTitle(expressed);
    
}; //end changeAttribute
    
    
// set up pie chart
function makeChart(csvData, colorScale){ 

    // build array of values in expressed attr
    var area = [];
    for (var i=0; i<csvData.length; i++){
        var val = parseFloat(csvData[i][expressed]);
        area.push(val);
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
    
    // arc generator
    var arcGenerator = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius)
    
    // set size of chart
    var chartMargin = 40,
    radius = Math.min(chartWidth, chartHeight) /2 - chartMargin;
    
    // calc position of each pie slice
    var pie = d3.pie()
        .value(function(d) {return d.value; })
    
    // get state name
    var key = function(d){ return d.data.name; };
    
    // map chart to data
        var c = chart.selectAll('.pieSlice')
        .data(pie(d3.entries(area)), key)
        .enter()
        .append('path')
        .sort(function(a,b){
            return b.value - a.value;
            })
        .transition()
        .duration(1000)
        .attr('d', d3.arc()
             .innerRadius(radius * 0.6)
             .outerRadius(radius)
        )
        .attr('fill', function(d){
            return chartopleth(d.value, colorScale) }) 
        .attr('stroke', 'white')
        .style('stroke-width', '1px')
        .style("opacity", 1) ;
    
}; // end makeChart
    
 //function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    
    var selected = d3.selectAll("." + props["name"])
        .style("stroke", "white")
        .style("opacity", "0.6");
    
        setLabel(props);
    
}; // end highlight
    
//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props["name"])
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        })
        .style("opacity", 1);
    
    d3.select(".infolabel")
        .remove();

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
}; // end dehighlight
    

//function to create dynamic label
function setLabel(props){
    
    // set NaN as 0    
    var val = props[expressed];
    val = val ? val: 0;
    
    // round to 2 decimals
    var sqMi = Math.round(val * 100) / 100;
    
    // get state name
    state = props.name;
    
    //label content
    var labelAttribute = "<h4>" + state +
        " has " + sqMi + " sq mi of " + expressed + "</h4>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.name + "_label")
        .html(labelAttribute);
};
    
//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

    
})();