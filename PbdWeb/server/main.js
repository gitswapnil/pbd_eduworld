import { Meteor } from 'meteor/meteor';
import '../imports/startup/server/methods.js';          //import all the methods
import startupScripts from '../imports/startup/server/startupScripts.js';   //import all startup scripts
import '../imports/routes.jsx';   //import all startup scripts
import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';

Meteor.startup(() => {
  startupScripts();

  //add the apiKey to an executive;
  Accounts.onCreateUser((options, user) => {
  	// console.log("user: " + JSON.stringify(user));
  	// console.log("options: " + JSON.stringify(options));
  	let customizedUser = Object.assign({}, user);
  	if(options.role && (options.role === "executive")) {
	  	const apiKey = Random.hexString(32);
	  	console.log(`adding an API key: ${apiKey}, to the user with id: ${user._id}.`);
  		customizedUser.apiKey = apiKey;
  	}
  	
	if (options.profile) {
		customizedUser.profile = Object.assign({}, options.profile);
	}

  	return customizedUser;
  });


});
