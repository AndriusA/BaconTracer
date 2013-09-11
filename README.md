BaconTracer
===========

A thin layer between your Bacon program and Bacon.js that maps relationships between all the observables (`EventStream`, `Property` and `Bus`). The idea was to build a tool without modifying Bacon.js that infers the structure of the code using it with minimal effort. Therefore there are only three steps in using it:

1. Override the default Bacon with `var Bacon = BaconTracer.proxyObject(window.Bacon)` - don't modify the global reference though, for now it breaks things
2. Annotate the observables you are interested in by assigning `BaconName` to them, e.g. `someEventStream.BaconName = "SpecialEventStream"`
3. Plot into a HTML element: `BaconTracer.drawRelationshipsForce("#graph")`

In addition to Bacon itself, BaconTracer only depends on D3 for showing the graph of the program structure.

There is an example in the examples directory - some unnecessary EventStreams and a bus are created on purpose just to show how it works.

Limitations
-----------

**Big one:** relies on experimental Proxy features, by default only available on recent versions of Firefox. You can also make it work on recent versions of Chrome if you enable experimental JS features. Read more about them in the [original proposal](http://wiki.ecmascript.org/doku.php?id=harmony:proxies).

- Only maps relationships found during execution - dead code will not be analyzed
- `flatMap` is problematic - in most cases won't work
- `combineTemplate` does not (yet) work
- No mapping yet from Observables to what happens within `onValue`