var World = (function(){

  var ctrlKey = false;
  var brush;
  var selectedRows = [];
  var selectedCountries = [];
  var countryStrokeWidth = 2.0;
  var countyStrokeWidth = 1.0;
  var currentSelectionKey = 0;
  var selections = d3.map();
  var countiesSelectionMap = d3.map();

  // A Map for all the Nodes
  var nodeMap = new Map();
  var colors = d3.scale.category10();
  
  var subjectClassMap = undefined;
  var scale, translate;
  var worldBackground;

  var selectedGdam0 = [];

  var gdam0NameMap = new Map();

  // for some countrues the gdam0 id does noch match the adam0 id (??)
  gdam0NameMap.set("Brunei",35);
  gdam0NameMap.set("Indonesia",106);
  gdam0NameMap.set("Cambodia",40); // all entries are faulty
  gdam0NameMap.set("Laos",123);
  gdam0NameMap.set("Myanmar",154);
  gdam0NameMap.set("Malaysia",136);
  gdam0NameMap.set("Philippines",177);
  gdam0NameMap.set("Singapore",203);
  gdam0NameMap.set("Thailand",226);
  gdam0NameMap.set("Vietnam",247);

  var gdamToAdam = new Map();
  gdamToAdam.set("35","36");
  gdamToAdam.set("106","106");
  gdamToAdam.set("40","40");
  gdamToAdam.set("123","123");
  gdamToAdam.set("154","154");
  gdamToAdam.set("136","136");
  gdamToAdam.set("177","179");
  gdamToAdam.set("203","205");
  gdamToAdam.set("226","228");
  gdamToAdam.set("247","250");


  var histogramIndexFromName = new Map();
  histogramIndexFromName.set("Brunei", 0);
  histogramIndexFromName.set("Indonesia",1);
  histogramIndexFromName.set("Cambodia",2); // all entries are faulty
  histogramIndexFromName.set("Laos",3);
  histogramIndexFromName.set("Myanmar",4);
  histogramIndexFromName.set("Malaysia",5);
  histogramIndexFromName.set("Philippines",6);
  histogramIndexFromName.set("Singapore",7);
  histogramIndexFromName.set("Thailand",8);
  histogramIndexFromName.set("Vietnam",9);

  var histogramIndexFromId = new Map();
  histogramIndexFromId.set(35, 0);
  histogramIndexFromId.set(36, 0);
  histogramIndexFromId.set(106,1);
  histogramIndexFromId.set(40,2); // all entries are faulty
  histogramIndexFromId.set(123,3);
  histogramIndexFromId.set(154,4);
  histogramIndexFromId.set(136,5);
  histogramIndexFromId.set(177,6);
  histogramIndexFromId.set(179,6);
  histogramIndexFromId.set(203,7);
  histogramIndexFromId.set(205,7);
  histogramIndexFromId.set(226,8);
  histogramIndexFromId.set(228,8);
  histogramIndexFromId.set(247,9);
  histogramIndexFromId.set(250,9);

  // untouched dataset from loading in the .csv
  var nodesFromFile = undefined;
  var edgesFromFile = undefined;

  var nodes = undefined;
  var edges = undefined;

  var subfield_arr = [];

  var yearMin = 1980;
  var yearMax = 2025;

  var thresh = -1;

  function World(elem) {

    this.elem = elem;
    this.width = elem.parentElement.offsetWidth;
    this.height = Math.max(elem.parentElement.offsetHeight, this.width*0.5);

    this.countriesMap = d3.map();
    this.countiesMap = d3.map();

    this.setupCanvas();
    this.setupZoom();
    this.setupBrushSelection();
    this.loadData();
  }

  World.prototype.setupCanvas = function() {
    // Create Canvas
    this.$svg = d3.select(this.elem)
      .append("svg");

    // Create definitions
    this.$defs = this.$svg.append('defs');

    // Create a Visualization Container
    this.$container = this.$svg.append("g")
      .attr("class", "vis-container");

    this.$gridContainer = this.$container.append("g")
      .attr("class", "grid-container");

    this.$bgmapContainer = this.$container.append("g")
      .attr("class", "bgmap-container");

    this.$mapContainer = this.$container.append("g")
      .attr("class", "map-container");

    this.$dataContainer = this.$container.append("g")
      .attr("class", "data-container");

    this.$selectionContainer = this.$container.append("g")
      .attr("class", "sel-container");

    this.$brushContainer = this.$container.append("g")
      .attr("class", "brush")
  };

  World.prototype.loadData = function() {

    // Load the World Map
    d3_queue.queue()
      .defer(d3.json, "data/final_s.json")
      .defer(d3.tsv, "data/countries.csv")
      .defer(d3.json, "data/world.json")
      .await((function(error, topoMap, countryArr, topoWorld) {
        if (error){
          console.error(error);
          return;
        }
        worldBackground = topoWorld;

        var countryMapTmp = d3.map();

        countryArr.forEach(function(d){
          countryMapTmp.set(d.ccc, d);
        });

        // TopoJson has all countries as properties
        for (var key in topoMap.objects) {
          if (topoMap.objects.hasOwnProperty(key)) {

            var gadm = +key.substr(-1);

            // Extract the Features from TopoJSON
            var topo = topojson.feature(topoMap, topoMap.objects[key]).features;

            if (gadm == 0) {
              var d = topo[0];
              var c = countryMapTmp.get(key.substr(0, 3));
              var key = d.properties.adm0;

              d.properties.centroid = d3.geo.centroid(d);
              d.properties = merge(d.properties, c);

              this.countriesMap.set(key, d);
            }
            else {
              
              topo.forEach((function(d){
                var key = d.properties.adm0 + ";" + d.properties.adm1;
                d.properties.centroid = d3.geo.centroid(d);

                this.countiesMap.set(key, d);
              }).bind(this));
            }
          }
        }

        // Scope
        var scope = angular.element(document.querySelectorAll("#body")).scope();

        // Just came until here, we need to move this code
        // Load the data now
        d3_queue.queue()
          .defer(d3.tsv, "data/52_records_asean.csv")
          .defer(d3.tsv, "data/52_asean_id1_id1_links_unweighted.csv")
          .await((function(){
            this.drawData.apply(this, arguments);
            scope.$broadcast('data-loaded');
          }).bind(this));

        // Load the filters
        d3_queue.queue()
          .defer(d3.tsv,"data/subject_classes.csv")
          .await((function(error, subjects){
            scope.$broadcast('subjects-loaded', {data: subjects});
          }).bind(this));

        this.initThresholdSelection();

      }).bind(this));
  };{}

  World.prototype.update = function() {
    this.width = this.elem.parentElement.offsetWidth;
    this.height = this.elem.parentElement.offsetHeight;

    this.updateCanvas();
    this.updateProjection();
    this.updateWorld();
    this.updateWorldBackground();
    this.updateCountries();
    this.updateCounties();
    this.updateSelections();
    this.updateGradientDefs();

    if (nodes && edges) {
      this.drawGraph(nodes, edges);
      this.updateStrokes();
    }
  }

  World.prototype.quickupdate = function() {
    this.updateSelections();
    if (nodes && edges) {
      this.drawGraph(nodes, edges);
      this.updateHistograms();
    }
  };

  World.prototype.updateCanvas = function(width, height) {
    var width = width || this.width;
    var height = height || this.height;
    // Update the canvas dimensions
    this.$svg
      .attr("width", width)
      .attr("height", height);
  }

  World.prototype.updateProjection = function() {  
    // Create a Mercator Projection
    this.projection = d3.geo.mercator()
        .translate([(this.width / 2), (this.height / 2)])
      .scale((this.width + 1) / 2 / Math.PI)
      .center([117, 5])
      .scale(400)
      .precision(.1);

    // Create a Shape Generator
    this.pathGenerator = d3.geo.path()
      .projection(this.projection);

    // Create a Grid Generator
    this.graticule = d3.geo.graticule();
  }

  World.prototype.updateWorld = function() {
    // Draw Grid
    var $$grid = this.$gridContainer
      .selectAll('.graticule')
      .data([this.graticule()]);

    $$grid.enter()
      .append("path")
      .attr("class", "graticule");

    $$grid.attr("d", this.pathGenerator);

    $$grid.exit()
      .remove();
    
    // Draw Equator
    var $$equator = this.$gridContainer
      .selectAll('.equator')
      .data([{type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]}]);

    $$equator.enter()
      .append("path")
      .attr("class", "equator");

    $$equator.attr("d", this.pathGenerator);

    $$equator.exit()
      .remove();
  }

  World.prototype.updateWorldBackground = function(){
    if (worldBackground === undefined) return;

    var worldTopology = topojson.feature(worldBackground, worldBackground.objects.countries).features;

    var $$countries = this.$bgmapContainer
      .selectAll("path")
      .data(worldTopology);

    $$countries.enter()
      .append("path");
    
    $$countries
      .attr("d", this.pathGenerator);

    $$countries.exit()
      .remove();
  }

  World.prototype.updateCountries = function() {
    var colors = d3.scale.category10();

    var $$country = this.$mapContainer
      .selectAll(".country")
      .data(this.countriesMap.values());

    $$country.enter().insert("path")
      .attr("class", "country");

    $$country
      .attr("d", this.pathGenerator)
      .style("stroke-width", countryStrokeWidth)
      //.style("fill", function(d, i){ return colors[i]; })
      .style("stroke-linecap", "round");

    $$country.exit()
      .remove();
  }

  World.prototype.updateCounties = function() {
    var $$county = this.$mapContainer
      .selectAll(".county")
      .data(this.countiesMap.values());

    $$county.enter().insert("path")
      .attr("class", "county");

    $$county
      .attr("d", this.pathGenerator)
      .attr("title", function(d,i) { return d.properties.name; })
      .style("stroke-width", countyStrokeWidth)
      .style("stroke-linecap", "round");

    // Here we should display some properties
    $$county.on('click', function(d){

     var scope = angular.element(document.querySelectorAll("#body")).scope();

      scope.current_country = d.properties.country;
      scope.current_county = d.properties.name;
      console.log(d.properties);
    });

    $$county.exit()
      .remove();
  }

  World.prototype.updateSelections = function() {
    var self = this;

    var $$sel = this.$selectionContainer.selectAll('rect')
      .data(selections.values().map(function(d){
        var b = d.brush.map(self.projection);
        d.x = [b[0][0], b[1][0]];
        d.y = [b[0][1], b[1][1]];
        return d;
      }), function(d){ return d.key; });

    $$sel.enter()
      .append('rect')
      .attr('class', 'selected-county');

    $$sel
      .attr('x', function(d){ return Math.min(d.x[0], d.x[1]); })
      .attr('width', function(d){ return Math.abs(d.x[1]-d.x[0]); })
      .attr('y', function(d){ return Math.min(d.y[0], d.y[1]); })
      .attr('height', function(d){ return Math.abs(d.y[1]-d.y[0]); });

    $$sel
      .on('dblclick', function(d){
        d3.event.stopPropagation();
        d3.select(this).remove();
        
        countiesSelectionMap.forEach(function(key, value){
          if (value === d.key) {
            countiesSelectionMap.remove(key);
          }
        });
        selections.remove(d.key);

        self.quickupdate();
      })

    $$sel.exit()
      .remove();
  }

  World.prototype.updateGradientDefs = function() {
    var self = this;
    var defs = [];
    var colors = d3.scale.category10();
    var vals = this.countriesMap.values();
    for (var i=0;i<vals.length;i++) {
      vals[i].color = colors(i);
      for (var j=0;j<vals.length;j++) {
        defs.push({from:vals[i], to:vals[j]});
      }
    }

    $$grads = this.$defs.selectAll('linearGradient')
      .data(defs.map(function(d){
        var sourceCounty = d.from;
        var targetCounty = d.to;
        var sourcePos = self.projection(sourceCounty.properties.centroid);
        var targetPos = self.projection(targetCounty.properties.centroid);
        d.sourcePos = sourcePos;
        d.targetPos = targetPos;
        return d;
      }));

    $$grads.enter()
      .append('linearGradient')
      .attr('id', function(d){ return "grad-" + d.from.properties.adm0 + ';' + d.to.properties.adm0; })
      .attr('gradientUnits', "userSpaceOnUse")
      .attr('x1', function(d){ return d.sourcePos[0] })
      .attr('y1', function(d){ return d.sourcePos[1] })
      .attr('x2', function(d){ return d.targetPos[0] })
      .attr('y2', function(d){ return d.targetPos[1] })
      .each(function(d){
        var $grad = d3.select(this);
        $grad.append('stop')
          .attr('offset', "0%")
          .style("stop-color", d.from.color)
          .style("stop-opacity", "1");

        $grad.append('stop')
          .attr('offset', "100%")
          .style("stop-color", d.to.color)
          .style("stop-opacity", "1");
      });
  }

  World.prototype.updateStrokes = function(dx, dy) {
    var t = translate;
    var s = scale; 
    var h = this.height/4;

    if (t !== undefined && s !== undefined) {
      t[0] = Math.min(
        (this.width/this.height)  * (s - 1), 
        Math.max( this.width * (1 - s), t[0] )
      );

      t[1] = Math.min(
        h * (s - 1) + h * s, 
        Math.max(this.height  * (1 - s) - h * s, t[1])
      );

      this.$bgmapContainer.selectAll("path")
        .style("stroke-width", 1.0 / s);
      // Adjust the stroke width
      this.$mapContainer.selectAll(".country")
        .style("stroke-width", 2.0 / s);
      this.$mapContainer.selectAll(".county")
        .style("stroke-width", 1.0 / s);
    }
  }

  World.prototype.setupBrushSelection = function() {
    var self = this;

    var x = d3.scale.linear()
      .domain([0, this.width])
      .range([0, this.width]);

    var y = d3.scale.linear()
      .domain([0, this.height])
      .range([0, this.height]);

    brush = d3.svg.brush()
      .x(x).y(y);

    var countiesInSelection = [];

    var brushstart = function(){
      ++currentSelectionKey;
      countiesInSelection = [];
    };

    var brushed = function(){
      var b = brush.extent();

      countiesInSelection = self.countiesMap.values().filter(function(d){
        var center = self.projection(d.properties.centroid);

        return (center[0] >= b[0][0] && center[0] <= b[1][0]) &&
          (center[1] >= b[0][1] && center[1] <= b[1][1]) ? true : false;
      });
    };

    var brushend = function(){
      var b = brush.extent();
      var bi = b.map(self.projection.invert);
      if (countiesInSelection.length > 0){
        countiesInSelection.forEach(function(d){
          var key = d.properties.adm0 + ";" + d.properties.adm1;
          countiesSelectionMap.set(key, currentSelectionKey);
        });

        selections.set(currentSelectionKey, {
          key: currentSelectionKey,
          brush: bi
        });
        brush.clear();
        self.quickupdate();
      }
      brush.extent(bi.map(self.projection));
    };

    d3.select('body')
      .on('keydown', function(d){
        ctrlKey = d3.event.ctrlKey;
        if (ctrlKey){
          brush.clear();
          self.$brushContainer.call(brush);
          brush
            .on("brushstart", brushstart)
            .on("brushend", brushend)
            .on("brush", brushed);
        }
      })
      .on('keyup', function(d){
        ctrlKey = d3.event.ctrlKey;
        self.$brushContainer.selectAll('*').remove();
        brush
          .on("brushstart", null)
          .on("brushend", null)
          .on("brush", null);
      });
  }

  World.prototype.setupZoom = function() {
    // Drag and Zoom Setup
    var zoom = d3.behavior.zoom();
      //.scaleExtent([1, 15]);

    // Zoom Callback
    var zoomed = (function() {
      if (ctrlKey) return;

      var t = d3.event.translate;
      var s = d3.event.scale; 
      
      zoom.translate(t);

      // Perform the Zoom
      this.$container
        .attr("transform", "translate(" + t + ")scale(" + s + ")");

      translate = t;
      scale = s;
      this.updateStrokes();
    }).bind(this);

    // Apply the zoom
    this.$svg
      .call(zoom.on("zoom", zoomed));
  }

  // ****************************************************************************
  // *                             Needs refactoring                            *
  // ****************************************************************************

  World.prototype.drawData = function(error, records, links, nodeFilterFns, edgeFilterFns){

    if (nodeFilterFns === undefined) {
      nodeFilterFns = [function() {
        return true;
      }]
    }

    if (edgeFilterFns === undefined) {
      edgeFilterFns = [function() {
        return true;
      }]
    }

    if(nodesFromFile === undefined){
        nodesFromFile = records;
    }

    if(edgesFromFile === undefined){
        edgesFromFile = links;
    }

    nodeMap = new Map();

    nodes = records
      // Apply Filter
      .filter(function(d){
        
        // Remove records that don't have the country id
        if (d.gadm_id_0 == "" || d.gadm_id_1 == "") {
          return false;
        }
        return true;
      });

    // Apply custom filter functions
    nodeFilterFns.forEach(function(d){
      nodes = nodes.filter(d);
    });

    nodes
      // Apply Map
      .map(function(d){

        var key = d.gadm_id_0 + ";" + d.gadm_id_1;

        // Add to node map
        nodeMap.set(key,d);

        // Return key
        return {
          name: key
        };
      });

    edges = links
      // Apply filter
      .filter(function(d){
        var source_key = d.gadm_id0_1 + ";" + d.gadm_id1_1;
        var target_key = d.gadm_id0_2 + ";" + d.gadm_id1_2;

        // Remove links where we don't have the records
        if (!nodeMap.has(source_key) || !nodeMap.has(target_key)) {
          return false;
        }
        return true;
      });

    edgeFilterFns.forEach(function(d){
      edges = edges.filter(d);
    });


    var scope = angular.element(document.querySelectorAll("#body")).scope();
      scope.node_count = nodes.length.toString();
      scope.edge_count = edges.length.toString();

    this.drawGraph(nodes, edges);
  };

  World.prototype.drawGraph = function(nodes, edges){
    var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d) { return d[0]; })
      .y(function(d) { return d[1]; });

    var data = aggregateEdgesByGadm1(edges)
      .filter((function(d){
        var sourceKey = gdamToAdam.get(d.gadm_id0_1) + ";" + d.gadm_id1_1;
        var targetKey = gdamToAdam.get(d.gadm_id0_2) + ";" + d.gadm_id1_2;
        if (!this.countiesMap.has(sourceKey) || !this.countiesMap.has(targetKey)) {
          return false;
        }
        return true;
      }).bind(this)).map((function(d){
        var sourceKey = gdamToAdam.get(d.gadm_id0_1) + ";" + d.gadm_id1_1;
        var targetKey = gdamToAdam.get(d.gadm_id0_2) + ";" + d.gadm_id1_2;
        var sourceCounty = this.countiesMap.get(sourceKey);
        var targetCounty = this.countiesMap.get(targetKey);
        var sourcePos = this.projection(sourceCounty.properties.centroid);
        var targetPos = this.projection(targetCounty.properties.centroid);
        
        var vec = [targetPos[0] - sourcePos[0], targetPos[1] - sourcePos[1]];
        var dis = Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1]);
        var height = Math.sqrt(dis*2);
        var middlePosition = [sourcePos[0] + vec[0]*0.5, sourcePos[1] + vec[1]*0.5];
        var middleNormal = [vec[1]/dis, -vec[0]/dis];
        var extraPoint = [middlePosition[0] + height*middleNormal[0], middlePosition[1] + height*middleNormal[1]];

        d.edge = [sourcePos, extraPoint, targetPos];
        return d;
      }).bind(this));

    $$edges = this.$dataContainer
      .selectAll('.link')
      .data(data, function(d){
        return d.gadm_id1_1 + ";" + d.gadm_id1_2;
      });

    $$edges.enter()
      .append('path')
      .attr('class', 'link');

    $$edges
      //.style('stroke', function(d, i) { return colors(i); })
      .style('stroke', function(d, i) { return 'url(#grad-' + gdamToAdam.get(d.gadm_id0_1) + ';' + gdamToAdam.get(d.gadm_id0_2) + ')'; })
      .style('stroke-width', function(d) { return 0.4 * Math.sqrt(d.count); })
      .style('stroke-opacity', function(d){
        var sourceKey = gdamToAdam.get(d.gadm_id0_1) + ";" + d.gadm_id1_1;
        var targetKey = gdamToAdam.get(d.gadm_id0_2) + ";" + d.gadm_id1_2;
        if (countiesSelectionMap.size() === 0){
          return 0.4;
        }
        else if (countiesSelectionMap.has(sourceKey) || countiesSelectionMap.has(targetKey)){
          return 0.9;
        }
        return 0.05;
      })
      .attr('d', function(d){ return line(d.edge); });

    $$edges.exit()
      .remove();
  }

  function aggregateEdgesByGadm1(edges){
    return aggregateEdges(edges, function(d){
      return d.gadm_id1_1 + ";" + d.gadm_id1_2;
    });
  }

  function aggregateEdgesByGadm0(edges){
    return aggregateEdges(edges, function(d){
      return d.gadm_id0_1 + ";" + d.gadm_id0_2;
    });
  }

  function aggregateEdges(edges, keyFn) {
    var edgeMap = new Map();

    edges.forEach(function(d, i){
      
      var key = keyFn(d, i);
      if (edgeMap.has(key)) {
        edgeMap.set(key, edgeMap.get(key) + 1);
      }
      else {
        edgeMap.set(key, 1); 
      }
    });

    return edges.map(function(d, i){

      var key = keyFn(d, i);
      d.count = edgeMap.get(key);
      
      return d;

    }).filter(function(d, i){
      
      var key = keyFn(d, i);
      if (!edgeMap.has(key)){
        return false;
      }
      edgeMap.delete(key);

      return true;
    });
  }

  World.prototype.setSelectedYear = function(min, max){
    yearMin = min;
    yearMax = max;
    this.drawData({},nodesFromFile,edgesFromFile,
      [this.yearNodeFilter,this.subjectClassNodeFilter,this.thresholdNodeFilter],
      [this.subjectClassEdgeFilter,this.histogramEdgeFilter]);
  };

  World.prototype.yearNodeFilter = function(d,i){
      return parseInt(d.year) >= yearMin && parseInt(d.year) <= yearMax;
  };

  World.prototype.yearEdgeFilter = function(d, i){
      var source_key = d.gadm_id0_1 + ";" + d.gadm_id1_1;
      var target_key = d.gadm_id0_2 + ";" + d.gadm_id1_2;
      var year_1 = parseInt(nodeMap.get(source_key).year);
      var year_2 = parseInt(nodeMap.get(target_key).year);

      return year_1 >= yearMin && year_1 <= yearMax && year_2 >= yearMin && year_2 <= yearMax ;
  };

  World.prototype.setSelectedRows = function(rows){
    selectedRows = rows;
    this.subjectClassWatch(rows);
  }

  World.prototype.setSelectedCountries = function(countries){
    selectedCountries = countries;

    selectedGdam0 = selectedCountries.map(function(d){
      return gdam0NameMap.get(d);
    });

    this.drawData({},nodesFromFile,edgesFromFile,
      [this.yearNodeFilter,this.subjectClassNodeFilter,this.thresholdNodeFilter],
      [this.subjectClassEdgeFilter, this.histogramEdgeFilter]);
  }

  World.prototype.updateHistograms = function() {
    if(edges === undefined) return;
    if(selectedCountries === undefined) return;

    var $barContainer = d3.select('#general-view');

    var margin = {top: 40, right: 20, bottom: 30, left: 20},
      width = $barContainer[0][0].offsetWidth,
      height = 200;

    $$barCharts = $barContainer.selectAll('.barchart')
      .data(selectedCountries, function(d){ return d; });

    $$barCharts.enter()
      .append('svg')
      .attr('class', function(d) { return 'barchart ' + d});

    $$barCharts
      .transition()
      .attr('width', width)
      .attr('height', height);

    $$barCharts.exit()
      .attr('opacity', 1)
      .transition()
      .duration(750)
      .ease(d3.ease('quad-out'))
      .attr('opacity', 0)
      .attr('height', 0)
      .each("end", function(){
        d3.select(this).remove();
      });

    $$barCharts.each(function(d){

      var svg = d3.select(this).selectAll('g')
        .data([true]);

      svg.enter()
        .append("g");

      svg.attr("transform", "translate(" + 0 + "," + margin.top + ")");

      $$title = svg.selectAll('.title')
        .data([true]);

      $$title.enter()
        .append('text')
        .attr('class', 'title');

      $$title
        .attr('x', width*0.5 - margin.left)
        .attr('y', -10)
        .style('text-anchor', 'middle')
        .text(d);

      var histogram = [
        {domain:"BN", val: 0},
        {domain:"ID", val: 0},
        {domain:"KH", val: 0},
        {domain:"LA", val: 0},
        {domain:"MM", val: 0},
        {domain:"MY", val: 0},
        {domain:"PH", val: 0},
        {domain:"SG", val: 0},
        {domain:"TH", val: 0},
        {domain:"VN", val: 0}
      ];

      edges
        .filter(function(d){
          var sourceKey = gdamToAdam.get(d.gadm_id0_1) + ";" + d.gadm_id1_1;
          var targetKey = gdamToAdam.get(d.gadm_id0_2) + ";" + d.gadm_id1_2;
          if (countiesSelectionMap.size() === 0){
            return true;
          }
          else if (countiesSelectionMap.has(sourceKey) || countiesSelectionMap.has(targetKey)){
            return true;
          }
          return false;
        })

        .forEach(function(edge){

          var id = gdam0NameMap.get(d);

          var otherIndex = undefined;

          if(edge.gadm_id0_1 == id){
              otherIndex = histogramIndexFromId.get(parseInt(edge.gadm_id0_2));
          } else if(edge.gadm_id0_2 ==id){
              otherIndex = histogramIndexFromId.get(parseInt(edge.gadm_id0_1));

          }

          if(otherIndex != undefined ){
              histogram[otherIndex].val+=1;
          }

      });

      var x = d3.scale.ordinal()
        .rangeRoundBands([margin.left, width - margin.left - margin.right], .1)
        .domain(histogram.map(function(d){return d.domain;}));

      var y = d3.scale.linear()
        .range([height-margin.bottom-margin.top, margin.top])
        .domain([0, d3.max(histogram,function(d){return d.val;})]);

      var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

      var $$axis = svg.selectAll('.x-axis')
        .data([true]);

      $$axis.enter().append("g")
        .attr("class", "x-axis");

      $$axis
        .attr("transform", "translate(0," + y(0) + ")")
        .call(xAxis);

      var $$bars = svg.selectAll(".bar")
          .data(histogram, function(d){ return d.domain; });

      $$bars.enter().append("rect")
          .attr("class", "bar")
          .attr("y", function(d) { return  y(0); })
          .attr("height", 0);

      $$bars
          .attr("x", function(d,i){ return x(d.domain) })
          .attr("width", x.rangeBand())
          .attr("fill", "teal");

      $$bars
          .transition()
          .duration(500)
          .ease(d3.ease('cubic-in'))
          .attr("y", function(d) { return  y(d.val); })
          .attr("height", function(d) { return y(0) - y(d.val); });

      $$bars.exit()
        .remove();

      var $$labels = svg.selectAll(".label")
          .data(histogram, function(d){ return d.domain; });

      $$labels.enter().append("text")
          .attr('class', 'label')
          .attr("y", function(d) { return y(0) });

      $$labels
          .text(function(d){return d.val.toString();})
          .attr("x", function(d,i){ return x(d.domain) + x.rangeBand()/2; })
          .attr("fill","black");

      $$labels
          .transition()
          .duration(500)
          .ease(d3.ease('cubic-in'))
          .attr("y", function(d) { return y(d.val) });

      $$labels.exit()
        .remove();
    });

  };

  World.prototype.initThresholdSelection = function(){

      var scope = angular.element(document.querySelectorAll("#body")).scope();

      scope.$watch('citation_thresh.text',function(newVal,oldVal){
        this.thresholdSetup(scope);
        if(nodesFromFile !== undefined && edgesFromFile !== undefined ){
          this.drawData({},nodesFromFile,edgesFromFile,
              [this.thresholdNodeFilter,this.subjectClassNodeFilter,this.yearNodeFilter],
              [this.subjectClassEdgeFilter,this.histogramEdgeFilter]);

            this.updateHistograms();
        }

      }.bind(this));

  };

  World.prototype.thresholdSetup = function(scope){
      thresh = parseInt(scope.citation_thresh.text);
      if(isNaN(thresh)){
          thresh = -1;
      }

  }

  World.prototype.thresholdNodeFilter = function(d){
      return parseInt(d.timescited_corr) >= thresh || thresh == -1;
  };

    World.prototype.subjectClassWatch = function (newVal) {
        this.subjectClassFilterSetup(newVal);
        if (nodesFromFile !== undefined && edgesFromFile !== undefined) {
            this.drawData({}, nodesFromFile, edgesFromFile,
                [this.subjectClassNodeFilter,this.yearNodeFilter,this.thresholdNodeFilter],
                [this.subjectClassEdgeFilter,this.histogramEdgeFilter]
            );

            this.updateHistograms();
        }
    };

    World.prototype.subjectClassNodeFilter = function(d,i){
        return subfield_arr.includes(parseInt(d.id_subfield));
    };

    World.prototype.subjectClassEdgeFilter = function(d,i){
        var source_key = d.gadm_id0_1 + ";" + d.gadm_id1_1;
        var target_key = d.gadm_id0_2 + ";" + d.gadm_id1_2;
        var subfield_1 = parseInt(nodeMap.get(source_key).id_subfield);
        var subfield_2 = parseInt(nodeMap.get(target_key).id_subfield);

        return subfield_arr.includes(subfield_1) && subfield_arr.includes(subfield_2);
    };

    World.prototype.subjectClassFilterSetup = function(newSelectedSubjects){
        subfield_arr = newSelectedSubjects.map(function (d) {
          return parseInt(d.subfield_id);
        });
    };

    World.prototype.histogramEdgeFilter = function(d){
        if(selectedGdam0.length === 0){return true;}
        return selectedGdam0.includes(parseInt(d.gadm_id0_1)) || selectedGdam0.includes(parseInt(d.gadm_id0_2));
    };

  return World;
})();