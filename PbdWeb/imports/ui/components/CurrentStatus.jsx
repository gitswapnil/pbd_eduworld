import { Meteor } from 'meteor/meteor'
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	Meteor.publish('executives.getExecutiveStatus', function(){
		console.log("Publishing the executives.getExecutiveStatus...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			const handle1 = Meteor.users.find({}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(_id && Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "executive"})) {
						const userDoc = Meteor.users.findOne({ _id }, {fields: {"services": 0, apiKey: 0}});
						userDoc.isExecutive = true;
						if(userDoc.active) {
							this.added('users', _id, userDoc);		//just send the ids.
						}
					}
				},

				changed: (_id, doc) => {
					if(_id && Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "executive"})) {
						const userDoc = Meteor.users.findOne({ _id }, {fields: {"services": 0, apiKey: 0}});
						userDoc.isExecutive = true;
						if(userDoc.active) {
							this.added('users', _id, userDoc);		//just send the ids.
						}
					}
				}
			});

			console.log("data publication for \"executives.getExecutiveStatus is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
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
	import { Tracker } from 'meteor/tracker';

	const CurrentStatus = (props) => {
		const [executives, setExecutives] = useState([]);

		useEffect(() => {
			const handle = Meteor.subscribe('executives.getExecutiveStatus', {
				onStop(error) {
					console.log("executives.getExecutiveStatus is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("executives.getExecutiveStatus is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const executives = Meteor.users.find({"isExecutive": true}).fetch();
					setExecutives(executives);	
				}
			})

			return function() {
				handle.stop();
			}
		}, []);

		return (
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12">
						{
							executives.map(executive => 
								<div>
									<IndividualStatus 	key={executive._id} 
														img={executive.profile && executive.profile.img}
														name={executive.profile && executive.profile.name}
														email={executive.emails && executive.emails[executive.emails.length - 1].address}
														mobileNo={executive.username}/>
									<br/>
								</div>
							)
						}
					</div>
				</div>
			</div>
		)
	}
	export default CurrentStatus;
}
