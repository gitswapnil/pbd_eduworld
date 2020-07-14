import { Meteor } from 'meteor/meteor'
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	Meteor.publish('currentStatus.getEveryoneStatus', function(){
		console.log("Publishing the currentStatus.getEveryoneStatus...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			let userIds = [];
			let initializing = true;		//flag to skip the huge loading during initial time.

			const handle1 = Meteor.users.find({}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(_id && Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "executive"})) {
						const userDoc = Meteor.users.findOne({ _id }, {fields: {"services": 0, apiKey: 0}});
						userDoc.isExecutive = true;
						if(userDoc.active) {
							userIds.push(_id);
							this.added('users', _id, userDoc);		//just send the ids.
						}
					}
				},

				changed: (_id, doc) => {
					if(_id && Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "executive"})) {
						const userDoc = Meteor.users.findOne({ _id }, {fields: {"services": 0, apiKey: 0}});
						userDoc.isExecutive = true;
						if(userDoc.active) {
							userIds.push(_id);
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

				// console.log("userIdRecorder: " + JSON.stringify(userIdRecorder));

				initializing = false;
			});

			const todayStart = moment().startOf('day').toDate();
			const todayEnd = moment().endOf('day').toDate();

			const handle3 = Collections.tasks.find({ createdAt: { $gte: todayStart, $lte: todayEnd }, type: 0, userId: { $in: userIds } }).observeChanges({
				added: (_id, doc) => {
					const party = Meteor.users.findOne({ _id: doc.partyId });
					doc.partyName = party.profile.name;
					doc.partyAddress = party.profile.address;
					this.added('tasks', _id, doc);
					
				},

				changed: (_id, doc) => {

					const task = Collections.tasks.findOne({ _id });
					const party = Meteor.users.findOne({ _id: task.partyId });
					doc.partyName = party.profile.name;
					doc.partyAddress = party.profile.address;
					this.changed('tasks', _id, task);
				},

				removed: (_id) => {
					this.removed('tasks', _id);
				}
			});


			const handle4 = Collections.followUps.find({ reminderDate: { $gte: todayStart, $lte: todayEnd }, userId: { $in: userIds } }).observeChanges({
				added: (_id, doc) => {
					const party = Meteor.users.findOne({ _id: doc.partyId });
					doc.partyName = party.profile.name;
					doc.partyAddress = party.profile.address;
					const task = Collections.tasks.findOne({ _id: doc.taskId });
					doc.cpName = task.cpName;
					doc.cpNumber = task.cpNumber;
					this.added('followUps', _id, doc);
				},

				changed: (_id, doc) => {
					const followUp = Collections.followUps.findOne({ _id });
					const party = Meteor.users.findOne({ _id: followUp.partyId });
					doc.partyName = party.profile.name;
					doc.partyAddress = party.profile.address;
					const task = Collections.tasks.findOne({ _id: followUp.taskId });
					doc.cpName = task.cpName;
					doc.cpNumber = task.cpNumber;
					this.changed('followUps', _id, doc);
				},

				removed: (_id) => {
					this.removed('followUps', _id);
				}
			});

			console.log("data publication for \"currentStatus.getEveryoneStatus is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				handle2.stop();
				handle3.stop();
				handle4.stop();
				console.log("Publication, \"currentStatus.getEveryoneStatus\" is stopped.");
			});
		} else {
			this.ready();
		}
	});
}

// Meteor.methods({

// });

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import IndividualStatus from './IndividualStatus';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';

	const CurrentStatus = (props) => {
		const [executives, setExecutives] = useState([]);
		const [loading, setLoading] = useState(true);

		useEffect(() => {
			const handle = Meteor.subscribe('currentStatus.getEveryoneStatus', {
				onStop(error) {
					console.log("currentStatus.getEveryoneStatus is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("currentStatus.getEveryoneStatus is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const executives = Meteor.users.find({"isExecutive": true}).map(user => {
						const userLocationObj = Collections.locations.findOne({ _id: user._id });
						if(!userLocationObj) {
							return user;
						}

						const visits = Collections.tasks.find({ userId: user._id }, {sort: {createdAt: -1}}).fetch();

						const todayStart = moment().startOf('day').toDate();
						const todayEnd = moment().endOf('day').toDate();
						let followUpsIdRecoder = {};
						let followUps = [];
						Collections.followUps.find({ userId: user._id }, {sort: {createdAt: -1}}).forEach(followUp => {
							if(!followUpsIdRecoder[followUp.partyId]) {
								followUpsIdRecoder[followUp.partyId] = true;

								if(Collections.tasks.findOne({ createdAt: { $gte: todayStart, $lte: todayEnd }, userId: followUp.userId, partyId: followUp.partyId, reason: { $gte: followUp.followUpFor } })) {
									followUp.completed = true;
								} else {
									followUp.completed = false;
								}

								followUps.push(followUp);
							}
						});

						return Object.assign({ sessions: userLocationObj.sessions, visits, followUps }, user);
					});

					setExecutives(executives);
					setLoading(false);
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
							(loading) ? 
							<div className="text-center">
								<FontAwesomeIcon icon={faCircleNotch} spin/> Loading...
							</div>
							
							:

							(executives.length) ?

							executives.map(executive => 
								<div>
									<IndividualStatus 	key={executive._id} 
														img={executive.profile && executive.profile.img}
														name={executive.profile && executive.profile.name}
														email={executive.emails && executive.emails[executive.emails.length - 1].address}
														mobileNo={executive.username}
														sessions={executive.sessions}
														visits={executive.visits}
														followUps={executive.followUps}
														/>
									<br/>
								</div>
							)
							:
							<div className="text-center"> No executive created. Please go to Manage Executives tab and create executive's profile. </div>
						}
					</div>
				</div>
			</div>
		)
	}
	export default CurrentStatus;
}
