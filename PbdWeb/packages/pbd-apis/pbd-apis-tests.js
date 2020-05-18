// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by pbd-apis.js.
import { name as packageName } from "meteor/pbd-apis";

// Write your tests here!
// Here is an example.
Tinytest.add('pbd-apis - example', function (test) {
  test.equal(packageName, "pbd-apis");
});
