import SimpleSchema from 'simpl-schema';

const followUps = new Mongo.Collection("followUps");

followUps.attachSchema(new SimpleSchema({
	partyId: { 
		type: String, 
		regEx: SimpleSchema.RegEx.Id
	},
	reminderDate: { 
		type: Date,
		optional: true 
	},
	followUpFor: {
		type: Number,
		optional: true
	},
	userId: { 
		type: String, 
		regEx: SimpleSchema.RegEx.Id 
	},
	createdAt: { 
		type: Date
	}
}));

export default followUps;