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
	"execIds": {
		type: Array
	},
	"execIds.$": {
		type: String
	},
	"createdAt": { 
		type: Date
	}
}))

export default notifications;