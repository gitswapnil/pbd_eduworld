import SimpleSchema from 'simpl-schema';

const projectData = new Mongo.Collection("projectData");

projectData.attachSchema(new SimpleSchema({
	webAppMajorVersion: {
		type: Number,
		min: 0
	},
	webAppMinorVersion: {
		type: Number,
		min: 0
	},
	webAppBuildNumber: {
		type: Number,
		min: 0
	},
	mobileAppMajorVersion: { 
		type: Number,
		min: 0
	},
	mobileAppMinorVersion: { 
		type: Number,
		min: 0
	},
	mobileAppBuildNumber: { 
		type: Number,
		min: 0
	},
	updatedAt: {
		type: Date,
		optional: true
	},
	createdAt: { 
		type: Date
	}
}));

export default projectData;