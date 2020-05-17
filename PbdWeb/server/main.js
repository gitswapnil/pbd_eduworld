import { Meteor } from 'meteor/meteor';
import '../imports/startup/server/methods.js';          //import all the methods
import startupScripts from '../imports/startup/server/startupScripts.js';   //import all startup scripts
// import Collections from 'meteor/collections';   //import all startup scripts

Meteor.startup(() => {
  startupScripts();
});
