import SimpleSchema from 'simpl-schema';

const tasks = new Mongo.Collection("tasks");

tasks.attachSchema(new SimpleSchema({
	type: { 
		type: String,
		optional: true
	},
	partyId: { 
		type: String, 
		regEx: SimpleSchema.RegEx.Id, 
		optional: true
	},
	cpName: { 
		type: String,
		optional: true
	},
	cpNumber: { 
		type: Number, 
		optional: true 
	},
	reason: { 
		type: Number,
	},
	doneWithTask: { 
		type: Boolean
	},
	reminder: { 
		type: Boolean 
	},
	remarks: { 
		type: String,
		optional: true 
	},
	subject: { 
		type: String,
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

export default tasks;