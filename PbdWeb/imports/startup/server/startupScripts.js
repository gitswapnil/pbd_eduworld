//Script for creating roles.
export const createRoles = () => {
	console.log("Creating Roles...");
	if(!Meteor.roles.findOne({"_id": "webmaster"})) {
		Roles.createRole('webmaster');
	}

	if(!Meteor.roles.findOne({"_id": "admin"})) {
		Roles.createRole('admin');
	}	

	if(!Meteor.roles.findOne({"_id": "executive"})) {
		Roles.createRole('executive');
	}

	Roles.addRolesToParent('executive', 'admin');
	Roles.addRolesToParent('admin', 'webmaster');

	console.log("Roles created successfully.");
}

// Deny all client-side updates to user documents
Meteor.users.deny({
  update() { return true; }
});

const startupScripts = () => {
	createRoles();
}

export default startupScripts;