// Write your package code here!
import SimpleSchema from 'simpl-schema';

console.log("Collections are being defined.");
const Collections = {
	locations: new Mongo.Collection("locations"),
}

Collections.locations.schema = new SimpleSchema({
	latitude: { type: Number },
	longitude: { type: Number },
	sessionId: { type: Number },
	userId: { type: String, regEx: SimpleSchema.RegEx.Id },
	createdAt: { type: Date }
})

Collections.locations.attachSchema(Collections.locations.schema);

export default Collections;
