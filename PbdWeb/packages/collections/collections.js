// Write your package code here!
import locations from './locations.js';
import tasks from './tasks.js';
import followUps from './followUps.js';
import receipts from './receipts.js';

import './users.js';		//just attach the schema

console.log("Collections are being defined.");
const Collections = {
	locations,
	tasks,
	followUps,
	receipts
}

export default Collections;
