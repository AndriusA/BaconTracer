function xyFromEvent(v) {
    return [v.clientX, v.clientY];
}

function getDelta(t) {
    var a = t[1];
    var b = t[0];
    return [a[0] - b[0], a[1] - b[1]];
}

function add(p1, p2) {
    return [p1[0] + p2[0], p1[1] + p2[1]];
}

$().ready(function () {
    var block = $("#clickable-block");
    var html = $("html");
    var Bacon = BaconTracer.proxyObject(window.Bacon);
    Bacon.BaconName = "TopBacon";

    var mouseDownES = block.asEventStream('mousedown').map(true);
    mouseDownES.BaconName = "mouseDownES";
    var mouseUpES = html.asEventStream('mouseup').map(false);
    mouseUpES.BaconName = "mouseUpES";
    var blockDragging = mouseDownES.merge(mouseUpES)
        .toProperty(false);
    blockDragging.BaconName = "blockDragging";
    console.log(blockDragging.BaconName, blockDragging.BaconInputs);

    var deltas = html.asEventStream('mousemove').map(xyFromEvent).slidingWindow(2, 2).map(getDelta);
    deltas.BaconName = "deltas"
    console.log(deltas.BaconName, deltas.BaconInputs);

    // Just like deltas, but [0,0] when user is not dragging the box.
    // Already returns a metaobject...
    var draggingDeltas = Bacon.combineWith(getDraggingDelta, deltas, blockDragging);
    draggingDeltas.BaconName = "draggingDeltas";
    console.log(draggingDeltas.BaconName, draggingDeltas.BaconInputs);

    var blockPosition = draggingDeltas.scan([0, 0], add);
    blockPosition.BaconName = "blockPosition";
    blockPosition.onValue(function (pos) {
        block.css({
            top: pos[1] + "px",
            left: pos[0] + "px"
        });
    });
    console.log(blockPosition.BaconInputs);

    // Uncomment the lines below to see some more examples
    // Experiment with Bus
    var bBus = new Bacon.Bus();
    bBus.BaconName = "bBus";
    console.log(bBus.BaconName, bBus.BaconInputs);
    bBus.plug(deltas);
    console.log(bBus.BaconName, bBus.BaconInputs);

    // Experiment with EventStreams
    var foo = mouseUpES.merge(mouseDownES);
    foo.BaconName = "foo";
    
    BaconTracer.drawRelationshipsForce("#graph");
});

function getDraggingDelta (delta, dragging) {
    if (!dragging) {
        return [0, 0];
    }
    return delta;
}