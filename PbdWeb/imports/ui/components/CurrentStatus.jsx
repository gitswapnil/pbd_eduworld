import { Meteor } from 'meteor/meteor'
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	Meteor.publish('executives.getExecutiveStatus', function(){
		console.log("Publishing the executives.getExecutiveStatus...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			let initializing = true;		//flag to skip the huge loading during initial time.

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

			const userIdRecorder = {};

			const getLocations = (callback) => {
				Collections.locations.rawCollection().aggregate([
					{
						$match: {
							createdAt: { 
				                $gte: moment().startOf('day').toDate(), 
				                $lte: moment().endOf('day').toDate()
				            }
						}
					},
					{
				        $sort: {
				            "createdAt": 1
				        }
				    },
				    {
				        $group: {
				            _id: "$sessionId",
				            latitude: { $last: "$latitude" },
				            longitude: { $last: "$longitude" },
				            userId: { $first: "$userId" },
				            start: { $first: "$createdAt" },
				            end: { $last: "$createdAt" }
				        }
				    },
				    {
				        $group: {
				            _id: "$userId",
				            locations: { 
				                $push: {
				                    sessionId: "$_id",
				                    start: "$start",
				                    end: "$end",
				                    latitude: "$latitude",
				                    longitude: "$longitude"
				                }
				            }
				        }
				    },
				    { $unwind: "$locations" },
				    {
				        $sort: {
				            "locations.start": 1
				        }
				    },
				    {
				        $group: {
				            _id: "$_id",
				            sessions: { 
				                $push: {
				                    sessionId: "$locations.sessionId",
				                    start: "$locations.start",
				                    end: "$locations.end",
				                    latitude: "$locations.latitude",
				                    longitude: "$locations.longitude"
				                }
				            }
				        }
				    }
				], (err, cursor) => {
					if(err) {
						throw new Meteor.Error("publication-error", err)
						return;
					}

					cursor.toArray(callback);
				})
			};

			const handle2 = Collections.locations.find({}).observeChanges({
				added: (_id, doc) => {
					if(!initializing) {
						getLocations((err, docs) => {
							// console.log("docs: " + JSON.stringify(docs));

							docs.forEach(doc => {
								if(userIdRecorder[doc._id]) {
									this.changed("locations", doc._id, doc);
								} else {
									this.added("locations", doc._id, doc);
								}
							});
						});
					}
				}
			});

			getLocations((err, docs) => {
				// console.log("docs: " + JSON.stringify(docs));
				docs.forEach(doc => {
					userIdRecorder[doc._id] = true;
					this.added("locations", doc._id, doc);
				});

				console.log("userIdRecorder: " + JSON.stringify(userIdRecorder));

				initializing = false;
			});

			console.log("data publication for \"executives.getExecutiveStatus is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				handle2.stop();
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
					const executives = Meteor.users.find({"isExecutive": true}).map(user => {
						const userLocationObj = Collections.locations.findOne({ _id: user._id });
						if(!userLocationObj) {
							return user;
						}
						// console.log("sessions: " + JSON.stringify(userLocationObj.sessions));
						return Object.assign({ sessions: userLocationObj.sessions }, user);
					});

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
														mobileNo={executive.username}
														sessions={executive.sessions}
														/>
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
