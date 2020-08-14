import SimpleSchema from 'simpl-schema';

const notifications = new Mongo.Collection("notifications");

notifications.attachSchema(new SimpleSchema({
	"text": {
		type: String,
		min: 1,
		max: 5000
	},
	"type": {
		type: String,
		allowedValues: ["info", "warn"]
	},
	"img": {
		type: String,
		optional: true,
	},
	"execs": {
		type: Array
	},
	"execs.$": {
		type: Object,
	},
	"execs.$.id": {
		type: String,
		regEx: SimpleSchema.RegEx.Id
	},
	"execs.$.status": {
		type: Boolean,
	},
	"createdAt": { 
		type: Date
	}
}))

export default notifications;