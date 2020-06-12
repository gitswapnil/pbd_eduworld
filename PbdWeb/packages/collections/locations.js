import SimpleSchema from 'simpl-schema';

const locations = new Mongo.Collection("locations");

locations.attachSchema(new SimpleSchema({
	latitude: { type: Number },
	longitude: { type: Number },
	sessionId: { type: Number },
	userId: { type: String, regEx: SimpleSchema.RegEx.Id },
	createdAt: { type: Date }
}));

export default locations;