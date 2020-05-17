// Write your package code here!
console.log("Collections are being defined.");
const Collections = {
	executives: new Mongo.Collection("executives"),
}

// Variables exported by this module can be imported by other packages and
// applications. See collections-tests.js for an example of importing.
export default Collections;
