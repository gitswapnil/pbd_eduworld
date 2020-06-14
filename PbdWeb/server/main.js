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
  	let customizedUser = Object.assign({ active: true }, user);
  	if(options.role && (options.role === "executive")) {
	  	const apiKey = Random.hexString(32);
	  	console.log(`adding an API key: ${apiKey}, to the user with id: ${user._id}.`);
  		customizedUser.apiKey = apiKey;
  	}

    if(options.role && (options.role === "party")) {
      //any party specific code can go here
    }
  	
    //check if the profile field is given or not
  	if(options.profile) {
  		customizedUser.profile = Object.assign({}, options.profile);
  	}

    //check if the active flag is present or not
    if(typeof options.active == "boolean") {
      customizedUser.active = options.active;
    }

    if(options.availableTo) {
      customizedUser.availableTo = [...options.availableTo];
    }

  	return customizedUser;
  });


});
