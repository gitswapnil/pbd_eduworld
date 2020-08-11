// Write your package code here!
import { Meteor } from 'meteor/meteor';
import locations from './locations.js';
import tasks from './tasks.js';
import followUps from './followUps.js';
import receipts from './receipts.js';
import notifications from './notifications.js';

import './users.js';		//just attach the schema

console.log("Collections are being defined.");
const Collections = {
	locations,
	tasks,
	followUps,
	receipts,
	notifications,
	temp: new Mongo.Collection("temp"),
	null: new Mongo.Collection(null),
}

export default Collections;
