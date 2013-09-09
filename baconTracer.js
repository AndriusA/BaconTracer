// Copyright (C) 2013 Andrius Aucinas, University of Cambridge
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// @author Andrius Aucinas

(function() {
  var BaconTracer;
  var Relationships;
  var counter = 0;
  var BaconMap = {};

  BaconMap[counter++] = {BaconID: counter, BaconName: "TOPLEVEL"};
  this.BaconTracer = BaconTracer = {}
  this.Relationships = Relationships = {}

  BaconTracer.proxyObject = function (target) {
    var BaconName = undefined;
    // A list of Bacon Observables that the current one takes data from
    var handler = new ForwardingHandler(target);
    var BaconID = counter++;
    var generator = undefined;
    
    handler.get = function(rcvr, name) {
      if (name === "BaconName") {
        return BaconName;
      }
      if (name === "BaconID") {
        return BaconID;
      }
      if (name === "generator") {
        return generator;
      }

      if (typeof this.target[name] === "function") {
          return BaconTracer.proxyFunction(this.target[name], name);
      }

      return this.target[name];
    };

    handler.set =  function(rcvr,name,val) {
      if (name === "BaconName") {
          BaconName = val;
          console.debug("Setting name "+val+" for observable ID", BaconID);
          return true;
      }
      if (name === "generator") {
        generator = val;
        console.log("set generator to", generator, val);
        return true;
      }
      this.target[name]=val;
      return true; 
    };

    try {
      var proxy = Proxy.create(handler, Object.getPrototypeOf(target));
      BaconMap[BaconID] = proxy;
      return proxy;
    } catch (err) {
      console.log("Error:");
      console.log(err.stack);
      throw err;
    } 
  }

  BaconTracer.proxyFunction = function (target, targetName) {
    return Proxy.createFunction(
      new ForwardingHandler(target),
      function() { 
        // trace();
        var targetFunResult = undefined;
        targetFunResult = target.apply(this, arguments);

        // Check if we want to encapsulate the result
        if (BaconInstance(targetFunResult)) {
          var proxy = BaconTracer.proxyObject(targetFunResult);
          console.log(targetName);
          proxy.generator = targetName;
          if (BaconInstance(this))
            addRelationship(proxy.BaconID, this.BaconID);
          for (arg in arguments){
            var argument = arguments[arg];
            if (BaconInstance(argument))
              addRelationship(proxy.BaconID, argument.BaconID);
          }

          // Special clause to deal with when EventStreams are created from HTML actions
          if (targetName === "asEventStream") {
            console.log(this.selector, arguments, targetName)
            var elementBaconID = counter++;
            BaconMap[elementBaconID] = {BaconID: elementBaconID, BaconName: this.selector, generator: arguments[0]};
            addRelationship(proxy.BaconID, elementBaconID);
            addRelationship(elementBaconID, 0);
          }

          return proxy;
        }

        // if the passed object is Bacon.Bus and the result is not a Bacon type,
        // assume arguments go into the bus
        if (this instanceof Bacon.Bus) {
          for (arg in arguments){
            var argument = arguments[arg];
            if (BaconInstance(argument))
              addRelationship(this.BaconID, argument.BaconID);
          }
        }
        return targetFunResult;
      },
      // When a function is called as a constructor (i.e. with New) - different logic
      function() {
        var temp = function(){};
        var inst, ret;
        temp.prototype = target.prototype;
        inst = new temp;
        ret = target.apply(inst, arguments);
        var targetFunResult = Object(ret) === ret ? ret : inst;
        
        if (targetFunResult instanceof Bacon.Bus) {
          var proxy = BaconTracer.proxyObject(targetFunResult);
          return proxy;
        } 
        return targetFunResult;
      }
    );
  }

  $.fn.asEventStream = BaconTracer.proxyFunction(Bacon.$.asEventStream, "asEventStream");

  function trace() {
    try {
      throw new Error("myError");
    }
    catch(err) {
      console.log(err.stack);
    }
  }

  function BaconInstance(obj) {
    return obj instanceof Bacon.EventStream 
      || obj instanceof Bacon.Property 
      || obj instanceof Bacon.Observable 
      || obj instanceof Bacon.Bus;
  }

  function addRelationship(target, source) {
    if (Relationships[source])
      Relationships[source].push(target)
    else 
      Relationships[source] = [target];
  }

  BaconTracer.getRelationshipsPairs = function(importantOnly){
    links = [];
    nodes = {};
    for (i in Relationships) {
      for (j in Relationships[i]) {
        if (!importantOnly || onPathToNamedNode(Relationships[i][j]))
          links.push({
            target: BaconMap[i].BaconID, 
            source: Relationships[i][j]
          })
      }
    }
    links.forEach(function(link) {
      link.source = nodes[link.source] || (nodes[link.source] = {id: link.source, name: BaconMap[link.source].BaconName, generator: BaconMap[link.source].generator});
      link.target = nodes[link.target] || (nodes[link.target] = {id: link.target, name: BaconMap[link.target].BaconName, generator: BaconMap[link.target].generator});
    });
    console.log(nodes);
    console.log(links);
    return {nodes: nodes, links: links};
  }

  function onPathToNamedNode(node) {
    if ( BaconMap[node].BaconName )
      return true;
    var onPath = false;
    for (child in Relationships[node]) {
      onPath = onPath || onPathToNamedNode(Relationships[node][child]);
    }
    return onPath;
  }

  BaconTracer.drawRelationshipsForce = function(elementID, importantOnly) {
    var svg = d3.select("#"+elementID).append("svg")
        .attr("width", "1400px")
        .attr("height", "1000px");
    // Chart dimensions.
    var margin = {top: 30, right: 80, bottom: 30, left: 30},
        width = 1400 - margin.right - margin.left,
        height = 1000 - margin.top - margin.bottom;

    var data = BaconTracer.getRelationshipsPairs(importantOnly);
    var force = d3.layout.force()
        .nodes(d3.values(data.nodes))
        .links(data.links)
        .size([width, height])
        .linkDistance(50)
        .charge(-600)
        .gravity(0.05)
        .theta(0.1)

    var area = svg.append("g")
        .attr("transform", "translate(" + (margin.left) + "," + margin.top + ")")
        .attr("width", width)
        .attr("height", height)    

    var defs = area.append("svg:defs")
    var pathArea = area.append("svg:g")
    var nodesArea = area.append("g")
    var textArea = area.append("g")
    
    var path, circle, text;

    function restart(links, nodes) {
        console.log("restarting");

        force.links(links);
        force.nodes(d3.values(nodes));
        force.on("tick", tick)

        var rootNode = force.nodes()[0];
        
        var markers = defs.selectAll("marker")
            .data(_.map(force.links(), function(d){ return d.target.id+"-"+d.source.id}), function(d){ return d;});

        markers.enter().append("marker")
                .attr("class", "linkMarker")
                .attr("id", String)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 16)
                .attr("refY", -1.5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
            .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");
        markers.exit().remove();

        path = pathArea.selectAll("path")
                .data(force.links(), function(d){ return d.target.id+"-"+d.source.id;})

        path.enter().append("svg:path")
                .attr("class", "link")
                .attr("marker-end", function(d) { return "url(#" + d.target.id +"-"+d.source.id + ")"; })

        path.exit().remove()


        circle = nodesArea.selectAll("circle")
                .data(force.nodes(), function(d) { return d.name; })

        circle.enter().append("circle")
                .attr("class", "nodeName")
                .attr("r", 6)
                .call(force.drag);

        circle.exit().remove();

        text = textArea.selectAll("g")
                .data(force.nodes())
        
        var svgText = text.enter().append("g");
        text.exit().remove();

        svgText.append("svg:text")
            .attr("text-anchor", "center")
            .attr("x", 10)
            .attr("y", 10)
            .text(function(d) { return (d.name ? d.name : d.id) + (d.generator ? " " + d.generator: "") });

        force.start();

        // Use elliptical arc path segments to doubly-encode directionality.
        function tick() {
            var nodes = force.nodes();
            for (i in nodes) {
              if (nodes[i].name && (!Relationships[nodes[i].id] || Relationships[nodes[i].id].length === 0))
                nodes[i].x = width-margin.right;
            }
            rootNode.x = 0;
            rootNode.y = height/2;
            for (i in force.nodes())
            path.attr("d", function(d) {
                // console.log("path", d);
                var dx = d.source.x - d.target.x,
                dy = 0,//d.source.y - d.target.y,
                dr = 0;//Math.sqrt(dx * dx + dy * dy);
                return "M" + d.target.x + "," + d.target.y + "A" + dr + "," + dr + " 0 0,1 " + d.source.x + "," + d.source.y;
            });

            circle.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

            text.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        }
    }

    restart(links, nodes); 
  }

  // NOTE: basically wrong, relationships between Observables does not necessarily (usually) form a tree
  BaconTracer.getRelationshipsTree = function(startNode){
    var nodeInfo = {};
    nodeInfo.name = BaconMap[startNode].BaconName;
    nodeInfo.nodeId = BaconMap[startNode].BaconID;
    if (Relationships[startNode] && Relationships[startNode].length > 0) {
      nodeInfo.children = [];
      for (childNo in Relationships[startNode]) {
        var child = Relationships[startNode][childNo];
        nodeInfo.children.push(BaconTracer.getRelationshipsTree(child));
      }
    }
    return nodeInfo;
  }

}).call(this);