import { Meteor } from 'meteor/meteor'
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	Meteor.publish('executives.getExecutiveStatus', function(){
		console.log("Publishing the executives.getExecutiveStatus...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {

			// console.log("userId: " +JSON.stringify(userIds));
			const handle1 = Meteor.roleAssignment.find({"role._id": "executive"}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(doc.user && doc.user._id) {
						const userDoc = Meteor.users.findOne({"_id": doc.user._id}, {fields: {"services": 0}});
						userDoc.isExecutive = true;
						this.added('users', userDoc._id, userDoc);
					}
				},

				changed: (_id, doc) => {
					if(doc.user && doc.user._id) {
						const userDoc = Meteor.users.findOne({"_id": doc.user._id}, {fields: {"services": 0}});
						userDoc.isExecutive = true;
						this.changed('users', userDoc._id, userDoc);
					}
				},
			});

			const handle2 = Meteor.

			console.log("data publication for \"executives.getExecutiveStatus is complete.\"");
			this.ready();
			this.onStop(() => {
				handle.stop();
				console.log("Publication, \"executives.getExecutiveStatus\" is stopped.");
			});
		}
	});
}

// Meteor.methods({

// });

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import IndividualStatus from './IndividualStatus';

	const CurrentStatus = (props) => {
		return (
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12">
						<IndividualStatus />
					</div>
				</div>
			</div>
		)
	}
	export default CurrentStatus;
}
