// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by collections.js.
import { name as packageName } from "meteor/collections";

// Write your tests here!
// Here is an example.
Tinytest.add('collections - example', function (test) {
  test.equal(packageName, "collections");
});
