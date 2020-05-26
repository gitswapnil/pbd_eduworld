import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';

//Script for creating roles.
export const createRoles = () => {
	console.log("Creating Roles...");
	
	Roles.createRole('webmaster', { unlessExists: true });
	Roles.createRole('admin', { unlessExists: true });
	Roles.createRole('executive', { unlessExists: true });
	Roles.createRole('party', { unlessExists: true });
	Roles.addRolesToParent('executive', 'admin');
	Roles.addRolesToParent('admin', 'webmaster');

	console.log("Roles created successfully.");
}

// Deny all client-side updates to user documents
Meteor.users.deny({
  update() { return true; }
});

const seedData = () => {
	console.log("Seeding the data...");
	if(!Meteor.users.findOne({"username": "9686059262"})){
		const userId = Random.id();
		Meteor.users.rawCollection().insertOne({
			"_id": userId, 
			"username": "9686059262", 
			"emails": [
				{"address": "ssbandiwadekar@gmail.com", "verified": true}
			], 
			"profile": {"name": "Swapnil Bandiwadekar"},
			"services": {
				"password": {"bcrypt": "$2b$10$WKdO1ovrMwPnikRsO542jexCpL/NqCjb4HgIRxl16w4RHmRoubq6e"},
			},
			"createdAt": new Date(),
		}, (err, res) => {
			if(err) {
				throw new Error("Unable to create a webmaster...");
			}
		});

		Roles.addUsersToRoles(userId, "webmaster", Roles.GLOBAL_GROUP);
	};
	console.log("Data seed complete.");
}

const startupScripts = () => {
	createRoles();
	seedData();
}

export default startupScripts;