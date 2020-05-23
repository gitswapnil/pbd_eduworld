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

const startupScripts = () => {
	createRoles();
}

export default startupScripts;