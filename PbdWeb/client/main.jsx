import React from 'react';
import { Meteor } from 'meteor/meteor';
import App from '/imports/routes';


Meteor.startup(() => {
	App();
});
