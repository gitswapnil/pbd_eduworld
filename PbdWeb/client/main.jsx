import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import { Tracker } from 'meteor/tracker';

import App from '/imports/ui/components/App';
import Login from '/imports/ui/components/Login';

/* This function checks for the authentication and loads the Login component if it is not logged in */
const checkAuthenticationAndLoad = (component) => {
	Tracker.autorun(() => {
		if(!Meteor.userId()) {
			render(<Login/>, document.getElementById('react-target'));
		} else {
			render(component, document.getElementById('react-target'));
		}
	});
}

Meteor.startup(() => {
	checkAuthenticationAndLoad(<App/>);
});
