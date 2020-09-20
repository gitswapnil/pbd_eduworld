import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import SimpleSchema from 'simpl-schema';
import Collections from 'meteor/collections';
import React from 'react';

if(Meteor.isClient) {
	import ReactDom from 'react-dom';

	import Login from './ui/components/Login';
	import Layout from './ui/components/Layout';
	import NavigationTabs from './ui/components/NavigationTabs';
	import NotFound from './ui/components/NotFound';

	import Settings from './ui/components/Settings';
	import CurrentStatus from './ui/components/CurrentStatus';
	import Notifications from './ui/components/Notifications';
	import Reports from './ui/components/Reports';
	import History from './ui/components/History';
	import CreateExecutives from './ui/components/CreateExecutives';
	import PartyDefinitions from './ui/components/PartyDefinitions';

	const renderComponent = (component) => {
		const container = document.getElementById("react-target");
		ReactDom.unmountComponentAtNode(container);
		ReactDom.render(component, container);
	};

	const checkAuthenticationAndExecute = (func) => {
		if(!Meteor.userId()) {
			Router.go('/login');		//if the user is not logged in, then take him to the Login route.
		} else {			//if he is logged in then execute the given function
			func();
		}
	};

	const routes = () => {
		Router.route('/', () => { 
			Router.go('/login');
		});
		
		Router.route('/login', () => {
			if(Meteor.userId()) {
				Router.go('/dashboard/currentstatus');
			} else {
				renderComponent(<Login/>);
			}
		});

		Router.route('/dashboard/currentstatus', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/dashboard/currentstatus", "name": "Current Status", "selected": true}, 
					{"link": "/dashboard/reports", "name": "Reports", "selected": false}, 
					{"link": "/dashboard/history", "name": "History", "selected": false}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="dashboard">
						<NavigationTabs tabs={tabs}>
							<CurrentStatus/>
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/dashboard/reports', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/dashboard/currentstatus", "name": "Current Status", "selected": false}, 
					{"link": "/dashboard/reports", "name": "Reports", "selected": true}, 
					{"link": "/dashboard/history", "name": "History", "selected": false}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="dashboard">
						<NavigationTabs tabs={tabs}>
							<Reports />
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/dashboard/history', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/dashboard/currentstatus", "name": "Current Status", "selected": false}, 
					{"link": "/dashboard/reports", "name": "Reports", "selected": false}, 
					{"link": "/dashboard/history", "name": "History", "selected": true}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="dashboard">
						<NavigationTabs tabs={tabs}>
							<History />
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/manageexecutives/createexecutive', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/manageexecutives/createexecutive", "name": "Create Executives", "selected": true}, 
					{"link": "/manageexecutives/notifications", "name": "Notifications", "selected": false}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="manageExecutives">
						<NavigationTabs tabs={tabs}>
							<CreateExecutives/>
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/manageexecutives/notifications', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/manageexecutives/createexecutive", "name": "Create Executives", "selected": false}, 
					{"link": "/manageexecutives/notifications", "name": "Notifications", "selected": true}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="manageExecutives">
						<NavigationTabs tabs={tabs}>
							<Notifications/>
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/schoolpartydata/definitions', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/schoolpartydata/definitions", "name": "Definitions", "selected": true} 
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="schoolPartyData">
						<NavigationTabs tabs={tabs}>
							<PartyDefinitions/>
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/profile/settings', () => {
			checkAuthenticationAndExecute(() => {
				renderComponent(<Settings />);
			});
		});

		Router.route('/logout', () => {
			checkAuthenticationAndExecute(() => {
				Meteor.logout();
			});
		});

		Router.route('/:error', () => {		//Any undefined route
			renderComponent(<NotFound/>);
		});
	};

	export default routes;
} else if(Meteor.isServer) {
	import { Accounts } from 'meteor/accounts-base';
	import { Random } from 'meteor/random';
	import fs from 'fs';
	import http from 'http';
	import querystring from 'querystring';
	import { finished } from 'stream';
	import { promisify } from 'util';
	import { Email } from 'meteor/email';
	import ReactDomServer from 'react-dom/server';
	import PdfMake from 'pdfmake';
	import { 	getReasonFromCode, 
				getCodeFromReason,
				PBD_NAME,
				PBD_ADDRESS,
				PBD_EMAIL,
				PBD_PHONE1,
				PBD_PHONE2,
				PBD_MOBILE1,
				PBD_MOBILE2,
				_2FACTORSENDERID,
				_2FATCORAPIKEY } from 'meteor/pbd-apis';

	Router.route('/api/testroute', {where: 'server'}).get(function(req, res, next) {
		console.log("This is testroute.");

		res.end("response from testroute. It is a get method.");
	});

	/*	
		params: { filename: String }
		return: File
	*/
	Router.route('/api/notificationimg/:notificationId', {where: 'server'}).get(function(req, res, next) {
		console.log("API: notificationimg invoked.");

		const notificationId = this.params.notificationId;
		console.log("notificationId: " + notificationId);

		const notification = Collections.notifications.findOne({ _id: notificationId });
		const base64Complete = notification.img.split(",");
		const metaData = base64Complete[0].split(":")[1].split(";")[0];
		const base64Data = base64Complete[1];
		const buffer = Buffer.from(base64Data, 'base64')

		const headers = {
			'Content-type': metaData,
			'Content-Disposition': `attachment; filename=${notificationId}.${metaData.split("/")[1]}`,
			'Content-Length': buffer.length
		};

		res.writeHead(200, headers);
		res.end(buffer);
	});

	/*	
		params: { filename: String }
		return: File
	*/
	Router.route('/api/downloadFile/:filename', {where: 'server'}).get(function(req, res, next) {
		console.log("API: downloadFile invoked.");
		console.log("filename: " + this.params.filename);
		const filename = this.params.filename;
		const extension = filename.split(".")[1];

		const readStream = fs.createReadStream(`/tmp/${filename}`);
		const fileStat = fs.statSync(`/tmp/${filename}`);
		const promisifiedFinished = promisify(finished);
		async function run() {
		  	await promisifiedFinished(readStream);
		  	console.log('Stream is done reading.');
		  	fs.unlink(`/tmp/${filename}`, (err) => {
				if (err) throw err;
				console.log('successfully deleted /tmp/'+filename);
			});
		}

		run().catch(console.error);
		readStream.resume(); // Drain the stream.

		res.writeHead(200, {
			'Content-disposition': `attachment; filename=${filename}`, 
			'Content-Length': fileStat.size,
			'Content-Type': (extension === "xls") ? 'application/vnd.ms-excel' : (extension === "pdf") ? 'application/pdf' : null
		}); //here you can add more headers
		readStream.pipe(res);

		return;
	});

	/*
		params: {phNo: String, pwd: String, apiKey: String}
		return: {error: Boolean, message: String}	if error is false then message is the apiKey for that user.
	*/
	Router.route('/api/executivelogin', {where: 'server'}).post(function(req, res, next) {
		console.log("API: executivelogin invoked.");
		const reqBody = req.body;
		console.log("phNo.: " + reqBody.phNo);
		console.log("pwd.: " + reqBody.pwd);

		//validate teh phone number and password in the beginning
		let schemaObj = {
			phNo: { 
				type: String,
				regEx: SimpleSchema.RegEx.Phone,
				label: "Phone Number"
			},
			pwd: { 
				type: String,
				label: "Password",
			},
		};

		const validationContext = new SimpleSchema(schemaObj, {clean: {filter: true, removeEmptyStrings: true, trimStrings: true}}).newContext();

		const cleanedInputs = validationContext.clean(reqBody);
		// console.log("cleanedInputs: " + JSON.stringify(cleanedInputs));
		validationContext.validate(cleanedInputs);

		if(validationContext.keyIsInvalid("phNo")) {		//the phone number should be properly given
			res.end(JSON.stringify({error: true, message: validationContext.keyErrorMessage("phNo"), code: 400}));
			return;
		}

		if(validationContext.keyIsInvalid("pwd")) {			//the password should be properly given
			res.end(JSON.stringify({error: true, message: validationContext.keyErrorMessage("pwd"), code: 400}));
			return;
		}

		let user = Accounts.findUserByUsername(reqBody.phNo);
		if(!user || !user.active) {				//if the user does not exists or if it is not active
			res.end(JSON.stringify({error: true, message: "Invalid phone number. Please check again.", code: 400}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
			return;
		}

		const passwordValid = Accounts._checkPassword(user, reqBody.pwd);
		if(passwordValid.error) {		//if the password is invalid
			res.end(JSON.stringify({error: true, message: "Incorrect Password.", code: 400}));
			return;
		}

		if(!user.apiKey) {
			res.end(JSON.stringify({error: true, message: "User does not have an apiKey.", code: 400}));
			return;
		}
		
		res.end(JSON.stringify({error: false, message: user.apiKey, code: 200}));
		return;
	});

	/*
		params: {
			apiKey: String, 
			deletedIds: [
				{
					id: Int,
					from: String,
					serverId: String
				}
			],
			locations: [
				{
					id: Int,
					latitude: Double,
					longitude: Double,
					sessionId: Int,
					createdAt: timeStamp<Long Int>
				}, ...
			],
			userDetails: {
				lastUpdatedAt: timestamp<Long Int>,
				fcmToken: String
			},
			lastPartyDetails: timestamp<Long Int>,
			tasks: [
				{
					id: Long,
    				type: Short,
    				partyId: String,
    				cpName: String,
    				cpNumber: Long,
    				reason: Short,
    				doneWithTask: Boolean,
    				reminder: Boolean,
    				reminderDate: Long,
    				remarks: String,
    				serverId: String?,
    				createdAt: Long,
				}, ...
			],
			followUps: [
				{
					id: Long,
    				partyId: String,
    				reminderDate: Long,
    				serverId: String?,
    				createdAt: Long,
				}, ...
			],
			firebaseData: {
				token: String
			}
			notificationLastUpdatedAt: timestamp<Long Int>
		}
		return: {
			error: Boolean, 
			message: "{
				deletedIds: [Long, Long, ...]
				locationIds: [Long, Long, ...]			//these are the ids which are saved in the database
				userDetails: {
					name: String,
					phoneNo: String,
					email: String,
					img: String,
					address: String,
					receiptSeries: String,
					updatedAt: String
				},
				partyDetails: {
					upsert: [
						{ 	
							id: HexString, 
							code: String, 
							name: String, 
							cNumber: Long,
							address: String, 
							updatedAt: timestamp<Long Int> 
						},
						...
					],
					remove: [HexString, HexString, ...]
				},
				taskIds: [
					{ id: Long, serverId: String }, ...
				],
				followUpIds: [
					{ id: Long, serverId: String }, ...
				],
			}",
			code: Integer
		}	if error is false then message is the apiKey for that user.
	*/

	const removeDocuments = async (userId, deletedIds) => {
		if(deletedIds) {
			if(!Array.isArray(deletedIds)) {		//validate the locations array
				throw new Error("Error in the given deletedIds Array.");
				return;
			}

			return deletedIds.map((deletedDoc, index) => {
				switch(deletedDoc.from) {
					case "followUps" : Collections.followUps.remove({ _id: deletedDoc.serverId });
							break;

					case "tasks" : Collections.tasks.remove({ _id: deletedDoc.serverId });
							break;
				}

				return deletedDoc.id;
			})
		}

		return;
	};

	const storeLocations = async (userId, locations) => {
		//if the locations key is defined.
		if(locations) {
			// console.log("locations: " + JSON.stringify(locations));
			if(!Array.isArray(locations)) {		//validate the locations array
				throw new Error("Error in the given locations Array.");
				return;
			}

			return locations.map((location, index) => {
				let obj = {
					latitude: location.latitude,
					longitude: location.longitude,
					sessionId: location.sessionId,
					userId: userId,
					createdAt: location.createdAt
				}

				Collections.locations.insert(obj, (err, res) => {
					if(err) {
						throw new Error(err.message);
					}
				});
				return location.id;
			});
		}

		return;
	};

	const getUserDetails = async (user, userDetails) => {
		if(userDetails) {
			try {
				const dbUserUpdatedAt = moment(user.updatedAt).unix() * 1000;		//convert the timeStamps to milliseconds

				if(userDetails.lastUpdatedAt < dbUserUpdatedAt) {		//if app's updatedAt is less than web's then only send app the updated values
					return {
						name: user.profile.name || "Unassigned",
						phoneNo: user.username,
						email: (user.emails && user.emails[user.emails.length - 1] && user.emails[user.emails.length - 1].address) || "Unknown",
						img: (user.profile.img && user.profile.img.split(",")[1]),
						address: user.profile.address || "Unknown",
						receiptSeries: user.profile.receiptSeries || "",
						updatedAt: dbUserUpdatedAt
					}
				}

				if(userDetails.fcmToken && (typeof userDetails.fcmToken === "string")) {
					Meteor.users.update({ _id: user._id }, { $set: { "appToken": userDetails.fcmToken } }, { multi: false });
				}

				return;
			} catch(e) {
				throw new Error(e.message);
			}
		}

		return;
	};

	const getPartyDetails = async (userId, lastUpdatedAtUnix) => {
		if(lastUpdatedAtUnix) {
			let partyDetails = new Promise((resolve, reject) => {
				const lastUpdatedAt = new Date(lastUpdatedAtUnix);

				Meteor.users.rawCollection().aggregate([
					{
				        $lookup: {
				            from: "role-assignment",
				            localField: "_id",
				            foreignField: "user._id",
				            as: "assignedRoleDoc"
				        }
				    },
				    {
				        $unwind: "$assignedRoleDoc"
				    },
				    {
				        $match: {
				            "assignedRoleDoc.role._id": "party",
				            updatedAt: { $gt: lastUpdatedAt },
				        }
				    },
				    {
				        $project: {
				            _id: 1,
				            updatedAt: 1,
				            active: 1,
				            code: "$username",
				            name: "$profile.name",
				            cNumber: "$profile.phoneNumber",
				            address: "$profile.address",
				            available: { $in: [userId, { $ifNull: ["$availableTo", []] }] }
				        }
				    },
				    {
				        $match: {
				            available: true
				        }
				    },
				    {
				        $group: {
				            _id: { $cond: ["$active", "upsert", "remove"] },
				            parties: { $addToSet: "$$ROOT" }
				        }
				    },
				    {
				        $project: {
				            _id: 1,
				            "parties._id": 1,
				            "parties.updatedAt": 1,
				            "parties.code": 1,
				            "parties.name": 1,
				            "parties.cNumber": 1,
				            "parties.address": 1,
				        }
				    },
				    {
				        $project: {
				            _id: 1,
				            parties: { 
				                $cond: [ { $eq: ["$_id", "remove"]}, "$parties._id", "$parties"]
				            }
				        }
				    },
				    {
				        $unwind: "$parties"
				    },
				    {
                        $project: {
                            "parties": {
                                $cond: [
                                    {$eq: ["$_id", "remove"]},
                                    "$parties",
                                    {
                                        "id": "$parties._id",
                                        "code": "$parties.code",
                                        "name": "$parties.name",
                                        "cNumber": "$parties.cNumber",
                                        "address": "$parties.address",
                                        "updatedAt": { $subtract: [ "$parties.updatedAt", new Date("1970-01-01") ] }
                                    }
                                ]
                            },
                        }
                    },
				    {
				        $group: {
				            _id: "data",
				            remove: {
				                $addToSet: { $cond: [{ $eq: ["$_id", "remove"] }, "$parties", null ]}
				            },
				            upsert: {
				                $addToSet: { $cond: [{ $eq: ["$_id", "upsert"] }, "$parties", null ]}
				            }
				        }
				    },
				    {
				        $project: {
				            _id: 1,
				            upsert: {
				                $filter: {
				                    input: "$upsert",
				                    as: "upsrt",
				                    cond: { $ne: ["$$upsrt", null] }
				                }
				            },
				            remove: {
				                $filter: {
				                    input: "$remove",
				                    as: "rmv",
				                    cond: { $ne: ["$$rmv", null] }
				                }
				            }
				        }
				    }
				], (error, cursor) => {
					if(error) {
						reject(new Error(error.message));
						return;
					} 

					cursor.toArray((err, docs) => {
						if(err) {
							reject(new Error(err.message));
							return;
						}

						let retData = { upsert: [], remove: [] };
						// console.log("docs: " + JSON.stringify(docs));
						if(docs.length) {
							retData.upsert = docs[0].upsert;
							retData.remove = docs[0].remove;
						}
						resolve(retData);
					});
				});
			});

			return await partyDetails;
			
		}

		return;
	};

	const storeTasks = async (userId, tasks) => {
		//if the locations key is defined.
		if(tasks) {
			// console.log("locations: " + JSON.stringify(locations));
			if(!Array.isArray(tasks)) {		//validate the locations array
				throw new Error("Error in the given tasks Array.");
				return;
			}

			return tasks.map((task, index) => {
				let obj = {
					type: task.type,
					partyId: task.partyId,
					cpName: task.cpName,
				    cpNumber: task.cpNumber,
				    reason: task.reason,
				    doneWithTask: (task.doneWithTask == 1),
				    reminder: task.reminder,
				    subject: task.subject,
				    remarks: task.remarks,
					userId: userId,
					createdAt: task.createdAt
				}

				let serverId = task.serverId

				if(typeof serverId === "string") {
					Collections.tasks.update({ _id: serverId }, {$set: obj}, {multi: false}, (err, docs) => { 
						if(err) throw new Error(err.message)
					});
				} else {
					serverId = Collections.tasks.insert(obj, (err, res) => { 
						if(err) throw new Error(err.message)
					});
				}


				return { id: task.id, serverId };
			});
		}

		return;
	};

	const storeFollowUps = (userId, followUps, tasks) => {
		//if the locations key is defined.
		if(followUps) {
			// console.log("locations: " + JSON.stringify(locations));
			if(!Array.isArray(followUps)) {		//validate the locations array
				throw new Error("Error in the given followUps Array.");
				return;
			}

			return followUps.map((followUp, index) => {
				let taskId;
				tasks.forEach(task => {
					task.id == followUp.taskId ? taskId = task.serverId : null
				});

				let obj = {
					partyId: followUp.partyId,
					taskId, 
					reminderDate: followUp.reminderDate,
					followUpFor: followUp.followUpFor,
					userId: userId,
					createdAt: followUp.createdAt
				}


				let serverId = followUp.serverId;
				if(typeof serverId === "string") {
					Collections.followUps.update({ _id: serverId }, {$unset: {reminderDate: 0, followUpFor: 0}}, {multi: false}, (err, docs) => { 
						if(err) throw new Error(err.message)

						//after complete unset, set the values.
						Collections.followUps.update({ _id: serverId }, {$set: obj}, {multi: false}, (err, docs) => { 
							if(err) {
								throw new Error(err.message)
							}
						});
					});
				} else {
					serverId = Collections.followUps.insert(obj, (err, res) => { 
						if(err) throw new Error(err.message)
					});
				}


				return { id: followUp.id, serverId };
			});
		}

		return;
	};

	const getNotifications = async (userId, notificationLastUpdatedAt) => {
		if(notificationLastUpdatedAt) {
			let notificationsPromise = new Promise((resolve, reject) => {
				const lastUpdatedAt = new Date(notificationLastUpdatedAt);

				Collections.notifications.rawCollection().aggregate([
					{
				        $match: {
				            "execs.id": userId,
				            createdAt: { $gt: lastUpdatedAt }
				        }
				    },
				    {
				        $project: {
				            _id: 1,
				            text: 1,
				            type: 1,
				            img: { $arrayElemAt: [{ $split: [ "$img", "," ] }, 1] },
				            createdAt: { $toLong: "$createdAt" }
				        }
				    },
				    { $sort: { "createdAt": -1 } },
				    {
                        $group: {
                            _id: null,
                            docs: {
                                $push: {
                                    "id": "$_id",
                                    "text": "$text",
                                    "type": "$type",
                                    "img": "$img",
                                    "createdAt": "$createdAt",
                                }
                            }
                        }
                    }
				], (error, cursor) => {
					if(error) {
						reject(new Error(error.message));
						return;
					} 

					cursor.toArray((err, docs) => {
						if(err) {
							reject(new Error(err.message));
							return;
						}

						let retData = [];
						if(docs && docs.length) {
							retData = [...docs[0].docs];
						}

						resolve(retData);
					});
				});
			});

			return await notificationsPromise
		}

		return;
	};

	Router.route('/api/syncdata', {where: 'server'}).post(function(req, res, next){
		console.log("API: syncdata invoked.");
		const reqBody = req.body;

		//if request body is not defined, then return error
		if(!reqBody) {
			res.end(JSON.stringify({error: true, message: "reqBody must have atleast an apiKey. requset body is null.", code: 400}));
			return;
		}

		console.log("syncdata reqBody: " + JSON.stringify(reqBody));
		//first check for the APIkey;
		console.log("apiKey: " + reqBody.apiKey);
		if(!reqBody.apiKey || (typeof reqBody.apiKey !== "string") || reqBody.apiKey.length !== 32) {
			res.end(JSON.stringify({error: true, message: "Invalid API key. Please check and try again.", code: 400}));
			return;
		}

		const user = Meteor.users.findOne({"apiKey": reqBody.apiKey});
		if(!user) {
			res.end(JSON.stringify({error: true, message: "Unkonwn API key.", code: 401}));
			return;
		}

		if(!user.active) {		//the user should be an active user
			res.end(JSON.stringify({error: true, message: "Inactive User.", code: 401}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
			return;
		}

		let returnObj = {};
		
		const deleteDocsApi = removeDocuments(user._id, reqBody.deletedIds).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});
		
		const locationsApi = storeLocations(user._id, reqBody.locations).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});

		const userDetailsApi = getUserDetails(user, reqBody.userDetails).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 500}));
			return;
		});

		const partyDetailsApi = getPartyDetails(user._id, reqBody.lastPartyDetails).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 500}));
			return;
		});

		const notificationsApi = getNotifications(user._id, reqBody.notificationLastUpdatedAt).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 500}));
			return;
		});

		const tasksApi = storeTasks(user._id, reqBody.tasks).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});

		// !!!!!!!!Do not uncomment this because it is kept as only old reference!!!!!
		// const followUpsApi = .catch(err => {
		// 	res.end(JSON.stringify({error: true, message: err.message, code: 400}));
		// 	return;
		// });

		const callAllFuncs = async () => {
			const values = await Promise.all([deleteDocsApi, locationsApi, userDetailsApi, partyDetailsApi, notificationsApi, tasksApi]);

			//this function is made separate because, it needs saved task ids
			const followUpsRetIds = storeFollowUps(user._id, reqBody.followUps, values[5]);

			const message = {
				deletedIds: values[0],
				locationIds: values[1],
				userDetails: values[2],
				partyDetails: values[3],
				notifications: values[4],
				taskIds: values[5],
				followUpIds: followUpsRetIds,
			}
			
			console.log(`return Message: ${JSON.stringify(message)}`);
			res.end(JSON.stringify({ error: false, message, code: 200 }));
		}

		callAllFuncs().catch(error => {
			res.end(JSON.stringify({ error: true, message: error.message, code: 500 }));
		})
	});

	/*
		params: {
			apiKey: String, 
			receiptDetails: {
				serverId: String,
				partyId: String,
				cpName: String,
				cpNumber: Long,
				cpEmail: String,
				amount: String,
				paidBy: 0, 1, 2
				chequeNo: String,
				ddNo: String,
				payment: 0, 1
			}
		}
		return: {
			error: Boolean, 
			message: "{
				receiptNo: Long,
				partyId: String,
				cpName: String,
				cpNumber: Long,
				cpEmail: String,
				amount: String,
				paidBy: 0, 1, 2
				chequeNo: String,
				ddNo: String,
				payment: 0, 1,
				serverId: String,
				createdAt: Long,
			}",
			code: Integer
		}	if error is false then message is the apiKey for that user.
	*/

	const emailReceipt = async (receiptId) => {
		const receipt = Collections.receipts.findOne({ _id: receiptId });

		if(!receipt) {
			console.log("Receipt not found. Hence not sending the email.");
			return;
		}

		const cps = receipt.cpList;
		if(!cps.length) {
			console.log("no contact person information is present, hence exiting from the function \"emailReceipt\".");
			return; 
		}

		// console.log("cps: " + JSON.stringify(cps));
		const to = cps.sort((a, b) => (b.createdAt - a.createdAt))[0].cpEmail;
		console.log("to: " + to);
		if(!to) {
			console.log("contact person email not found, hence exiting from the function \"emailReceipt\".");
			return;
		}

		try {
			const details = receipt;
			details.execProfile = Meteor.users.findOne({ _id: details.userId }).profile;
			details.party = Meteor.users.findOne({ _id: details.partyId });
			const fName = `${details.execProfile.receiptSeries}${details.receiptNo}`;

			const fonts = {
			  	Helvetica: {
				    normal: 'Helvetica',
				    bold: 'Helvetica-Bold',
				    italics: 'Helvetica-Oblique',
				    bolditalics: 'Helvetica-BoldOblique'
			  	},
			};

			let body = [
				[{text: 'Representative:', color: '#444'}, { text: `${details.execProfile.name}`, alignment: 'right'}],
				[{text: 'Receipt No.:', color: '#444'}, { text: `${details.execProfile.receiptSeries}${details.receiptNo}`, alignment: 'right'}],
				[{text: 'Date:', color: '#444'}, { text: `${moment(details.createdAt).format("DD-MMM-YYYY")}`, alignment: 'right'}],
				[{text: 'Customer Code:', color: '#444'}, { text: `${details.party.username}`, alignment: 'right'}],
				[{text: 'Name:', color: '#444'}, { text: `${details.party.profile.name}`, alignment: 'right'}],
				[{text: 'Address:', color: '#444'}, { text: `${details.party.profile.address}`, alignment: 'right'}],
				[{text: 'Customer Contact:', color: '#444'}, { text: `${details.party.profile.phoneNumber}`, alignment: 'right'}],
				[{text: 'Paid By:', color: '#444'}, { text: `${(details.paidBy === 0) ? "Cash" : (details.paidBy === 1) ? "Cheque" : "Demand Draft"}`, alignment: 'right'}],
			];

			if(details.paidBy === 1) {
				body.push([{text: 'Cheque No.:', color: '#444'}, { text: `${details.chequeNo}`, alignment: 'right'}]);
			} 

			if(details.paidBy === 2) {
				body.push([{text: 'Demand Draft No.:', color: '#444'}, { text: `${details.ddNo}`, alignment: 'right'}]);
			}

			if(details.paidBy !== 0) {
				body.push([{text: 'Bank Branch:', color: '#444'}, { text: `${details.bankBranch}`, alignment: 'right'}]);
				body.push([{text: 'Bank Name:', color: '#444'}, { text: `${details.bankName}`, alignment: 'right'}]);
			}

			body.push([{text: 'Payment:', color: '#444'}, { text: `${(details.payment === 0) ? "Part" : "Full"}`, alignment: 'right'}]);
			body.push([{text: 'Paid:', color: '#444'}, { text: `Rs.${(() => {
														let numStr = (parseFloat(details.amount) + 0.00001).toString().split(".");
														return `${numStr[0]}.${numStr[1].slice(0, 2)}`
													})()}`, alignment: 'right', fontSize: 18, bold: true}]);

			const pdfMake = new PdfMake(fonts);

			const docDefinition = {
				pageSize: 'A4',
				pageOrientation: 'portrait',
				// content,
				defaultStyle: {
				    font: 'Helvetica'
				},
				content: [
					{
						text: PBD_NAME,
						style: {
						    fontSize: 25
						},
					    alignment: 'center',
					    bold: true,
					},
					{
						text: PBD_ADDRESS,
						style: {
						    fontSize: 13,
						    color: "#555",
						},
					    alignment: 'center',
					},
					{
						text: [{ text: 'Email: ', bold: true }, PBD_EMAIL],
						style: {
						    fontSize: 13,
						    color: "#555",
						},
					    alignment: 'center',
					    margin: 2,
					},
					{
						text: [{ text: 'Phone: ', bold: true }, `${PBD_PHONE1}, ${PBD_PHONE2}`],
						style: {
						    fontSize: 13,
						    color: "#555",
						},
					    alignment: 'center',
					    margin: 2,
					},
					{
						text: [{ text: 'Mobile: ', bold: true }, `${PBD_MOBILE1}, ${PBD_MOBILE2}`],
						style: {
						    fontSize: 13,
						    color: "#555",
						},
					    alignment: 'center',
					    margin: 2,
					},
					'\n\n',
					{
						table: {
						    widths: ['*', '*'],
							body
						},
						layout: {
							hLineWidth: function (i, node) {
								return (i === 0) ? 0 : 1;
							},
							vLineWidth: function (i, node) {
								return 1;
							},
							hLineColor: function (i, node) {
								return 'gray';
							},
							vLineColor: function (i, node) {
								return 'white';
							},
						}
					},
					{
					    text: 'Receipt is valid subject to realization of Cheque',
					    alignment: 'center'
					},
				]
			};

			// console.log("docDefinition: " + JSON.stringify(docDefinition));

			let pdfDoc = pdfMake.createPdfKitDocument(docDefinition);
			pdfDoc.pipe(fs.createWriteStream(`/tmp/${fName}.pdf`));
			pdfDoc.end();

			Email.send({ 
				to, 
				from: "no-reply@mypbd.com", 
				subject: `PBD Eduworld Receipt #${fName}`, 
				html: ReactDomServer.renderToStaticMarkup(
					<div>
						<div>
							Hi, <b style={{ "fontSize": "18px" }}>{details.party.profile.name}</b>
							<div>Thanks for ordering from <b>{PBD_NAME}</b> This email serves as a receipt for your purchase. Please retain this email receipt for your records.</div>
						</div>
						<div style={{ textAlign: "center" }}>
							<div style={{ maxWidth: "500px", display: "inline-block", border: "1px solid #ccc", padding: "20px", textAlign: "center", color: "#555", marginBottom: "20px" }}>
								<div style={{ fontSize: "large" }}><b>{PBD_NAME}</b></div>
								<div style={{ fontSize: "small" }}>{PBD_ADDRESS}</div>
								<div style={{ fontSize: "small" }}><b>Email: </b>{PBD_EMAIL}</div>
								<div style={{ fontSize: "small" }}><b>Phone: </b>{PBD_PHONE1}, {PBD_PHONE2}</div>
								<div style={{ fontSize: "small" }}><b>Mobile: </b>{PBD_MOBILE1}, {PBD_MOBILE2}</div>
								<table style={{ width: "100%", marginTop: "10px" }}>
									<tbody>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Representative:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.execProfile.name}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Receipt No.:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.execProfile.receiptSeries}{details.receiptNo}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Date:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{moment(details.createdAt).format("DD-MMM-YYYY")}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Customer Code:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.party.username}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Name:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.party.profile.name}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Address:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.party.profile.address}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Customer Contact:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.party.profile.phoneNumber}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Paid By:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{(details.paidBy === 0) ? <span>Cash</span> : (details.paidBy === 1) ? <span>Cheque</span> : <span>Demand Draft</span>}</td>
										</tr>
										{
											(details.paidBy === 1) ?
											<tr>
												<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Cheque No.:</td>
												<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.chequeNo}</td>
											</tr>
											: null
										}
										{
											(details.paidBy === 2) ?
											<tr>
												<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Demand Draft No.:</td>
												<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.ddNo}</td>
											</tr>
											: null
										}
										{
											(details.paidBy !== 0) ? 
											<React.Fragment>
												<tr>
													<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Bank Name:</td>
													<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.bankName}</td>
												</tr>
												<tr>
													<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Bank Branch:</td>
													<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.bankBranch}</td>
												</tr>
											</React.Fragment>
											: null
										}
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Payment:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{(details.payment === 0) ? <span>Part</span> : <span>Full</span>}</td>
										</tr>
										<tr>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Paid:</td>
											<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>
												<div style={{ fontSize: "large", fontWeight: "bold" }}>₹
													{(() => {
														let numStr = (parseFloat(details.amount) + 0.00001).toString().split(".");
														return `${numStr[0]}.${numStr[1].slice(0, 2)}`
													})()}
												</div>
											</td>
										</tr>
									</tbody>
								</table>
								<div style={{ fontSize: "small" }}>Receipt is valid subject to realization of Cheque</div>
							</div>
						</div>
						<div>
							<div>Thank you for your payment.</div>
							<br/>
							<div style={{ color: "#AAA", fontWeight: "bold" }}>
								<i>
									Regards,<br/>
									{PBD_NAME}<br/>
									{PBD_ADDRESS}<br/>
									Mobile: {PBD_MOBILE1}, {PBD_MOBILE2}<br/>
									Phone: {PBD_PHONE1}, {PBD_PHONE2}<br/>
									https://mypbd.com
								</i>
							</div>
						</div>
					</div>
				), 
				attachments: [{ path: `/tmp/${fName}.pdf` }],
			});

			fs.unlink(`/tmp/${fName}.pdf`, (err) => {
				if(err) throw err;
				console.log("successfully deleted the temperary file.");
			});

			return;
		} catch(e) {
			console.log("Error in emailing the receipt: " + e.message);
			throw new Error("Error in emailing the receipt: " + e.message);
		}
	};

	const sendSMS = async (receiptId) => {
		const receipt = Collections.receipts.findOne({ _id: receiptId });

		if(!receipt) {
			console.log("Receipt not found. Hence not sending the sms.");
			return;
		}

		const cps = receipt.cpList;
		if(!cps.length) {
			console.log("no contact person information is present, hence exiting from the function \"sendSMS\".");
			return; 
		}

		// console.log("cps: " + JSON.stringify(cps));
		const to = cps.sort((a, b) => (b.createdAt - a.createdAt))[0].cpNumber;
		console.log("to: " + to);
		if(!to) {
			console.log("contact person number not found, hence exiting from the function \"sendSMS\".");
			return;
		}

		try {
			const exec = Meteor.users.findOne({ _id: receipt.userId });
			const party = Meteor.users.findOne({ _id: receipt.partyId });

			let numStr = (parseFloat(receipt.amount) + 0.00001).toString().split(".");

			let post_data = {
				From : _2FACTORSENDERID,
				To: to,
				VAR1: `${numStr[0]}.${numStr[1].slice(0, 2)}`,
				VAR2: `${party.profile.name}, ${party.profile.address}`,
				VAR3: `${exec.profile.receiptSeries}${receipt.receiptNo}`
			};

			if(receipt.paidBy == 0) {
				post_data.TemplateName = "ACK_paid_in_cash";
			} else if(receipt.paidBy == 1) {
				post_data.TemplateName = "ACK_paid_by_dd";
				post_data.VAR4 = receipt.ddNo;
				post_data.VAR5 = `${receipt.bankName}, ${receipt.bankBranch}`;
			} else if(receipt.paidBy == 2) {
				post_data.TemplateName = "ACK_paid_by_cheque";
				post_data.VAR4 = receipt.chequeNo;
				post_data.VAR5 = `${receipt.bankName}, ${receipt.bankBranch}`;
			}

			let sendResponse = new Promise((resolve, reject) => {
				var options = {
					host: 'www.2factor.in',
					path: `/API/V1/${_2FATCORAPIKEY}/ADDON_SERVICES/SEND/TSMS`,
					//This is what changes the request to a POST request
					method: 'POST',
					headers: {
					  	'Content-Type': 'multipart/form-data'
					}

				};

				const callback = function(response) {
					var str = ''
						response.on('data', function (chunk) {
						str += chunk;
					});

					response.on('end', function () {
						console.log(str);
						resolve(str);
					});
				};

				console.log("post_data: " + querystring.stringify(post_data));

				const httpRequest = http.request(options, callback);
				httpRequest.write(querystring.stringify(post_data));
				httpRequest.end();
			});

			return await sendResponse;
		} catch(e) {
			console.log("Error in sending the SMS: " + e.message);
			throw new Error("Error in sending the SMS: " + e.message);
		}
	};

	const generateReceipt = async (userId, receiptDetails) => {
		if(!receiptDetails.partyId || (receiptDetails.partyId.length == 32)) {
			throw new Error("Invalid partyId.");
			return;
		}

		const party = Meteor.users.findOne({ _id: receiptDetails.partyId });
		if(!party.active) {
			throw new Error("Forbidden action. Trying to create receipt for inactive party.");
			return;
		}

		if(party.availableTo) {
			const userAvailable = party.availableTo.find(elem => elem === userId)
			if(typeof userAvailable === "undefined") {
				throw new Error("Forbidden action. This party is not available for this executive.");
				return;
			}
		} else {
			throw new Error("This party is not available for this executive.");
			return;
		}

		if(!receiptDetails.cpName || (receiptDetails.cpName == "")) {
			throw new Error("Invalid contact Person Name.");
			return;
		}

		if(!receiptDetails.cpNumber || (receiptDetails.cpNumber == "")) {
			throw new Error("Invalid contact Person Number.");
			return;
		}

		if(receiptDetails.cpEmail && receiptDetails.cpEmail != "") {
			const validationContext = new SimpleSchema({ cpEmail: { type: String, regEx: SimpleSchema.RegEx.Email }}).newContext();
			if(!validationContext.validate({ cpEmail: receiptDetails.cpEmail })) {
				throw new Error("Invalid email.");
				return;
			}
		}

		if(!receiptDetails.amount || (receiptDetails.amount == "")) {
			throw new Error("The paid amount is neccessary to generate the receipt.");
			return;
		}

		if((typeof receiptDetails.paidBy !== "number") || (receiptDetails.paidBy > 2 && receiptDetails.paidBy < 0)) {
			throw new Error("Invalid PaidBy option.");
			return;
		}

		if(receiptDetails.paidBy == 1) {
			if(!receiptDetails.chequeNo || receiptDetails.chequeNo == "") {
				throw new Error("The Cheque Number is required.");
				return;
			}
		}

		if(receiptDetails.paidBy == 2) {
			if(!receiptDetails.ddNo || receiptDetails.ddNo == "") {
				throw new Error("The Demand Draft Number is required.");
				return;
			}
		}

		if(receiptDetails.paidBy !== 0) {
			if(!receiptDetails.bankName || receiptDetails.bankName == "") {
				throw new Error("The Bank Name is required");
				return;
			}

			if(!receiptDetails.bankBranch || receiptDetails.bankBranch == "") {
				throw new Error("The Bank Branch is required");
				return;
			}
		}

		if((typeof receiptDetails.payment !== "number") || (receiptDetails.payment > 1 && receiptDetails.payment < 0)) {
			throw new Error("Please enter whether the payment is full or part.");
			return;
		}

		let serverId;
		if(typeof receiptDetails.serverId == "string") {
			serverId = receiptDetails.serverId;

			const validationContext = new SimpleSchema({ serId: { type: String, regEx: SimpleSchema.RegEx.Id }}).newContext();
			if(!validationContext.validate({ serId: serverId })) {
				throw new Error("Invalid serverId.");
				return;
			}

			const receiptFound = Collections.receipts.findOne({ _id: serverId });
			if(!receiptFound) {
				throw new Error("Wrong receipt server id.");
				return;
			}
		}

		let details = new Promise((resolve, reject) => {
			const cpObj = {
				cpName: receiptDetails.cpName,
				cpNumber: receiptDetails.cpNumber,
				cpEmail: (receiptDetails.cpEmail == "") ? undefined : receiptDetails.cpEmail,
				createdAt: new Date()
			}

			if(serverId) {
				try {
					console.log("cpObj: " + JSON.stringify(cpObj))
					Collections.receipts.update({ _id: serverId }, { $push: { cpList: cpObj } });

					const retObj = Collections.receipts.findOne({ _id: serverId })
					retObj.serverId = retObj._id;
					delete retObj._id;
					delete retObj.cpList;
					Object.assign(retObj, cpObj);
					retObj.createdAt = moment(cpObj.createdAt).valueOf();
					resolve(retObj);
				} catch(e) {
					console.log("error in cpList update..." + e);
					reject(new Error("Problem in updating the receipt, please check the database and the request."));
				}
			} else {
				try {
					const prevReceipt = Collections.receipts.findOne({ userId }, {sort: { createdAt: -1 }});
					const prevReceiptNo = (prevReceipt && prevReceipt.receiptNo || 0);
					const receiptNo = parseInt(prevReceiptNo) + 1;

		        	const insertObj = {
			        	receiptNo,
			        	partyId: receiptDetails.partyId,
			        	cpList: [ cpObj ],
			        	amount: parseFloat(String(parseFloat(receiptDetails.amount * 1.0000000001)).match(/[0-9]+\.[0-9][0-9]/)[0]),
			        	paidBy: receiptDetails.paidBy,
			        	payment: receiptDetails.payment,
			        	userId,
			        	createdAt: new Date()
			        };

			        if(receiptDetails.paidBy === 1) {
			        	insertObj.chequeNo = receiptDetails.chequeNo;
			        } else if(receiptDetails.paidBy === 2) {
			        	insertObj.ddNo = receiptDetails.ddNo;
			        }

			        if(receiptDetails.paidBy !== 0) {
			        	insertObj.bankName = receiptDetails.bankName;
			        	insertObj.bankBranch = receiptDetails.bankBranch;
			        }

					const serverId = Collections.receipts.insert(insertObj);

			        const retObj = {
			        	serverId,
			        	receiptNo,
			        	partyId: receiptDetails.partyId,
			        	cpName: cpObj.cpName,
						cpNumber: cpObj.cpNumber,
						cpEmail: cpObj.cpEmail,
			        	amount: String(parseFloat(receiptDetails.amount * 1.0000000001)).match(/[0-9]+\.[0-9][0-9]/)[0],
			        	paidBy: receiptDetails.paidBy,
			        	chequeNo: receiptDetails.chequeNo,
			        	ddNo: receiptDetails.ddNo,
			        	bankName: receiptDetails.bankName,
			        	bankBranch: receiptDetails.bankBranch,
			        	payment: receiptDetails.payment,
			        	createdAt: moment(cpObj.createdAt).valueOf()
			        }

			        resolve(retObj);
				} catch(e) {
					reject(new Error("Problem in insertion of receipt, please check the database."));
				}
			}
		})
		
		return await details;
	};

	Router.route('/api/generatereceipt', {where: 'server'}).post(function(req, res, next){
		console.log("API: generatereceipt invoked.");
		const reqBody = req.body;

		//if request body is not defined, then return error
		if(!reqBody) {
			res.end(JSON.stringify({error: true, message: "reqBody must have atleast an apiKey. requset body is null.", code: 400}));
			return;
		}

		console.log("generatereceipt reqBody: " + JSON.stringify(reqBody));
		//first check for the APIkey;
		console.log("apiKey: " + reqBody.apiKey);
		if(!reqBody.apiKey || (typeof reqBody.apiKey !== "string") || reqBody.apiKey.length !== 32) {
			res.end(JSON.stringify({error: true, message: "Invalid API key. Please check and try again.", code: 400}));
			return;
		}

		const user = Meteor.users.findOne({"apiKey": reqBody.apiKey});
		if(!user) {
			res.end(JSON.stringify({error: true, message: "Unkonwn API key.", code: 401}));
			return;
		}

		if(!user.active) {		//the user should be an active user
			res.end(JSON.stringify({error: true, message: "Inactive User.", code: 401}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
			return;
		}

		let returnObj = {};
		
		const generateReceiptApi = generateReceipt(user._id, reqBody.receiptDetails).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});


		const callAllFuncs = async () => {
			const values = await Promise.all([generateReceiptApi]);

			// console.log(`values: ${JSON.stringify(values)}`);
			const message = { ...values[0] };

			// const sendSMSApi = sendSMS(message.serverId).catch(err => {
			// 	res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			// 	return;
			// });

			// const sendArrRetValues = await Promise.all([emailReceiptApi]);

			res.end(JSON.stringify({ error: false, message, code: 200 }));
		};

		callAllFuncs().catch(error => {
			console.log("error: " + error);
			res.end(JSON.stringify({ error: true, message: error.message, code: 500 }));
		});
	});

	/*
		params: {
			apiKey: String, 
			offset: Long,
			limit: Int
		},
		return: {
			error: Boolean, 
			message: "{
				tasks: [],
				receipts: [],
				followUps: [],
				parties: [],
				notifications: [],
				totalDataLength: Long,
			}",
			code: Integer
		}	if error is false then message is the apiKey for that user.
	*/

	Router.route('/api/restoredata', {where: 'server'}).post(function(req, res, next) {
		console.log("API: restoredata invoked.");
		const reqBody = req.body;

		//if request body is not defined, then return error
		if(!reqBody) {
			res.end(JSON.stringify({error: true, message: "reqBody must have atleast an apiKey. requset body is null.", code: 400}));
			return;
		}

		console.log("restoredata reqBody: " + JSON.stringify(reqBody));
		//first check for the APIkey;
		console.log("apiKey: " + reqBody.apiKey);
		if(!reqBody.apiKey || (typeof reqBody.apiKey !== "string") || reqBody.apiKey.length !== 32) {
			res.end(JSON.stringify({error: true, message: "Invalid API key. Please check and try again.", code: 400}));
			return;
		}

		const user = Meteor.users.findOne({"apiKey": reqBody.apiKey});
		if(!user) {
			res.end(JSON.stringify({error: true, message: "Unkonwn API key.", code: 401}));
			return;
		}

		if(!user.active) {		//the user should be an active user
			res.end(JSON.stringify({error: true, message: "Inactive User.", code: 401}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
			return;
		}

		if(typeof reqBody.offset !== "number") {
			res.end(JSON.stringify({error: true, message: "Invalid offset key. Please check and try again.", code: 400}));
			return;
		}

		if(typeof reqBody.limit !== "number") {
			res.end(JSON.stringify({error: true, message: "Invalid limit key. Please check and try again.", code: 400}));
			return;
		}

		let returnObj = {
			tasks: [],
			receipts: [],
			followUps: [],
			notifications: [],
			totalDataLength: 0
		};

		Meteor.users.rawCollection().aggregate([
			{
		        $addFields: {
		            "partyToAdd": { 
		                $cond: [
		                	{ $isArray: "$availableTo" },
		                    { $ne: [{ $indexOfArray: ["$availableTo", user._id] }, -1] },
		                    "$$REMOVE"
		                ]
		            },
		        }
		    },
		    {
		        $match: {
		            $or: [
		                { _id: user._id },
		                { partyToAdd: true },
		            ],
		            "active": true
			}
		    },
		    {
		        $group: {
		            _id: user._id,
		            active: { $first: "$active" },
		            createdAt: { $first: "$createdAt" },
		            updatedAt: { $first: "$updatedAt" },
		            username: { $first: "$username" },
		            emails: { $first: "$emails" },
		            apiKey: { $first: "$apiKey" },
		            profile: { $first: "$profile" },
		            appToken: { $first: "$appToken" },
		            parties: { 
		                $addToSet: {
		                    $cond:[ 
		                    	{$eq: ["$partyToAdd", true]}, 
		                        { 
		                            "_id": "$_id",
		                            "name": "$profile.name",
		                            "code": "$username",
		                            "cNumber": "$profile.phoneNumber",
		                            "address": "$profile.address",
		                            "updatedAt": { $toLong: "$updatedAt" },
		                            "createdAt": "$createdAt"
		                        }, 
		                        "$$REMOVE"
		                    ]
		                }
		            }
		        }
		    },
		    {
		        $lookup: {
		            from: "tasks",
		            foreignField: "userId",
		            localField: "_id",
		            as: "tasks",
		        }
		    },
		    {
		        $lookup: {
		            from: "receipts",
		            foreignField: "userId",
		            localField: "_id",
		            as: "receipts",
		        }
		    },
		    {
		        $lookup: {
		            from: "followUps",
		            foreignField: "userId",
		            localField: "_id",
		            as: "followUps",
		        }
		    },
		    {
		        $lookup: {
		            from: "notifications",
		            foreignField: "execs.id",
		            localField: "_id",
		            as: "notifications",
		        }
		    },
            { $unwind: { path: "$receipts", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$receipts.cpList", preserveNullAndEmptyArrays: true } },
            { 
                $addFields: {
                    "receipts.cpName": "$receipts.cpList.cpName",
                    "receipts.cpNumber": "$receipts.cpList.cpNumber",
                    "receipts.cpEmail": "$receipts.cpList.cpEmail",
                    "receipts.createdAt": "$receipts.cpList.createdAt"
                }
            },
            { $unset: ["receipts.cpList"] },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    username: 1,
                    emails: 1,
                    apiKey: 1,
                    profile: 1,
                    parties: 1,
                    tasks: 1,
                    receipts: { $cond: [ {$eq: [{ $type: "$receipts._id" }, "missing"]}, "$$REMOVE", "$receipts"]},
                    followUps: 1,
                    notifications: 1
                }
            },
            {
                $group: {
                    _id: "$_id",
                    username: { $first: "$username" },
                    emails: { $first: "$emails" },
                    apiKey: { $first: "$apiKey" },
                    profile: { $first: "$profile" },
                    tasks: { $first: "$tasks" },
                    receipts: { $addToSet: "$receipts" },
                    followUps: { $first: "$followUps" },
                    parties: { $first: "$parties" },
                    notifications: { $first: "$notifications" },
                }
            },
            { $unwind: { path: "$followUps", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                     _id: 1,
                    username: 1,
                    emails: 1,
                    apiKey: 1,
                    "profile.name": 1,
                    "profile.phoneNumber": 1,
                    "profile.address": 1,
                    "profile.img": { $arrayElemAt: [{ $split: [ "$profile.img", "," ] }, 1] },
                    "profile.receiptSeries": 1,
                    tasks: 1,
                    receipts: 1,
                    followUps: {
                        $cond: [
                            { $eq: [{ $type: "$followUps._id" }, "missing"] }, 
                            "$$REMOVE",
                            {
                                "_id": "$followUps._id",
                                "partyId": "$followUps.partyId",
                                "reminderDate": { $ifNull: [{ $toLong: "$followUps.reminderDate"}, "$followUps.reminderDate"] },
                                "taskId": "$followUps.taskId",
                                "followUpFor": "$followUps.followUpFor",
                                "userId": "$followUps.userId",
                                "createdAt": "$followUps.createdAt",
                            }
                        ]
                    },
                    parties: 1,
                    notifications: 1
                }
            },
            {
                $group: {
                    _id: "$_id",
                    username: { $first: "$username" },
                    emails: { $first: "$emails" },
                    apiKey: { $first: "$apiKey" },
                    profile: { $first: "$profile" },
                    tasks: { $first: "$tasks" },
                    receipts: { $first: "$receipts" },
                    followUps: { $addToSet: "$followUps" },
                    parties: { $first: "$parties" },
                    notifications: { $first: "$notifications" },
                }
            },
            { $unwind: { path: "$notifications", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    emails: 1,
                    apiKey: 1,
                    profile: 1,
                    tasks: 1,
                    receipts: 1,
                    followUps: 1,
                    parties: 1,
                    notifications: {
                        $cond: [
                            { $eq: [{ $type: "$notifications._id" }, "missing"] }, 
                            "$$REMOVE",
                            {
                                "_id": "$notifications._id",
                                "type": "$notifications.type",
                                "text": "$notifications.text",
                                "img": { $arrayElemAt: [{ $split: [ "$notifications.img", "," ] }, 1] },
                                "createdAt": "$notifications.createdAt",
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    username: { $first: "$username" },
                    emails: { $first: "$emails" },
                    apiKey: { $first: "$apiKey" },
                    profile: { $first: "$profile" },
                    tasks: { $first: "$tasks" },
                    receipts: { $first: "$receipts" },
                    followUps: { $first: "$followUps" },
                    parties: { $first: "$parties" },
                    notifications: { $addToSet: "$notifications" },
                }
            },
		    {
		        $addFields: {
		            "tasks.row": "task",
		            "receipts.row": "receipt",
		            "followUps.row": "followUp",
                    "parties.row": "party",
                    "notifications.row": "notification",
		        }
		    },
		    {
		        $project: {
		            username: 1,
		            emails: 1,
		            apiKey: 1,
		            profile: 1,
		            data: { $concatArrays: ["$tasks", "$receipts", "$followUps", "$parties", "$notifications"] }
		        }
		    },
            { $unwind: "$data" },
            { $sort: { "data.createdAt": 1} },
            { $skip: reqBody.offset },
            { $limit: reqBody.limit },
		    { $unwind: "$data" },
            { $unwind: { path: "$data.cpList", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    "data.createdAt": { $toLong: "$data.createdAt" }
                }
            },
		    {
		        $group: {
		            _id: "$_id",
		            username: { $first: "$username" },
		            emails: { $first: "$emails" },
		            apiKey: { $first: "$apiKey" },
		            profile: { $first: "$profile" },
		            tasks: { $addToSet: { $cond: [ { $eq: ["$data.row", "task"] }, "$data", 0] } },
		            receipts: { $addToSet: { $cond: [ { $eq: ["$data.row", "receipt"] }, "$data", 0] } },
		            followUps: { $addToSet: { $cond: [ { $eq: ["$data.row", "followUp"] }, "$data", 0] } },
					parties: { $addToSet: { $cond: [ { $eq: ["$data.row", "party"] }, "$data", 0] } },
					notifications: { $addToSet: { $cond: [ { $eq: ["$data.row", "notification"] }, "$data", 0] } },
		        }
		    },
		    {
		        $project: {
		            _id: 1,
		            username: 1,
		            emails: 1,
		            apiKey: 1,
		            profile: 1,
		            tasks: {
		                $filter: {
		                    input: "$tasks",
		                    as: "task",
		                    cond: { $ne: ["$$task", 0] }
		                }
		            },
		            receipts: {
		                $filter: {
		                    input: "$receipts",
		                    as: "receipt",
		                    cond: { $ne: ["$$receipt", 0] }
		                }
		            },
		            followUps: {
		                $filter: {
		                    input: "$followUps",
		                    as: "followUp",
		                    cond: { $ne: ["$$followUp", 0] }
		                }
		            },
                    parties: {
		                $filter: {
		                    input: "$parties",
		                    as: "party",
		                    cond: { $ne: ["$$party", 0] }
		                }
		            },
		            notifications: {
		                $filter: {
		                    input: "$notifications",
		                    as: "notification",
		                    cond: { $ne: ["$$notification", 0] }
		                }
		            },
		        }
		    },
		    {
		        $unset: [ "tasks.row", "tasks.userId", "receipts.row", "receipts.userId", "followUps.row", "followUps.userId", "parties.row", "parties.createdAt", "notifications.row" ]
		    }
		], (error, cursor) => {
			if(error) {
				res.end(JSON.stringify({error: true, message: error.message, code: 500}));
				return;
			} 

			cursor.toArray((err, docs) => {
				if(err) {
					res.end(JSON.stringify({error: true, message: err.message, code: 500}));
					return;
				}

				console.log("docs: " + JSON.stringify(docs));
				
				returnObj.tasks = (docs[0] && docs[0].tasks) ? [...docs[0].tasks] : [];
				returnObj.receipts = (docs[0] && docs[0].receipts) ? [...docs[0].receipts] : [];
				returnObj.followUps = (docs[0] && docs[0].followUps) ? [...docs[0].followUps] : [];
				returnObj.parties = (docs[0] && docs[0].parties) ? [...docs[0].parties] : [];
				returnObj.notifications = (docs[0] && docs[0].notifications) ? [...docs[0].notifications] : [];
				returnObj.dataLength = returnObj.tasks.length +  returnObj.receipts.length + returnObj.followUps.length + returnObj.parties.length + returnObj.notifications.length;

				console.log("restoredata returnObj: " + JSON.stringify(returnObj));

				res.end(JSON.stringify({error: false, message: returnObj, code: 200}));
			})
		});
	});


	// /*
	// 	params: {
	// 		apiKey: String, 
	// 		token: String,
	// 	},
	// 	return: {
	// 		error: Boolean, 
	// 		message: "ServerId",
	// 		code: Integer
	// 	}	if error is false then message is the apiKey for that user.
	// */

	// Router.route('/api/updateRegistrationToken', {where: 'server'}).post(function(req, res, next){
	// 	console.log("API: updateRegistrationToken invoked.");
	// 	const reqBody = req.body;

	// 	//if request body is not defined, then return error
	// 	if(!reqBody) {
	// 		res.end(JSON.stringify({error: true, message: "reqBody must have atleast an apiKey. requset body is null.", code: 400}));
	// 		return;
	// 	}

	// 	console.log("updateRegistrationToken reqBody: " + JSON.stringify(reqBody));
	// 	//first check for the APIkey;
	// 	console.log("apiKey: " + reqBody.apiKey);
	// 	if(!reqBody.apiKey || (typeof reqBody.apiKey !== "string") || reqBody.apiKey.length !== 32) {
	// 		res.end(JSON.stringify({error: true, message: "Invalid API key. Please check and try again.", code: 400}));
	// 		return;
	// 	}

	// 	const user = Meteor.users.findOne({"apiKey": reqBody.apiKey});
	// 	if(!user) {
	// 		res.end(JSON.stringify({error: true, message: "Unkonwn API key.", code: 401}));
	// 		return;
	// 	}

	// 	if(!user.active) {		//the user should be an active user
	// 		res.end(JSON.stringify({error: true, message: "Inactive User.", code: 401}));
	// 		return;
	// 	}

	// 	if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
	// 		res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
	// 		return;
	// 	}

	// 	if(!reqBody.token || (typeof reqBody.token !== "string")) {
	// 		res.end(JSON.stringify({error: true, message: "Invalid token. Please check and try again.", code: 400}));
	// 		return;
	// 	}

	// 	const oldToken = Collections.appTokens.findOne({ userId: user._id });
	// 	let serverId;

	// 	if(oldToken) {
	// 		serverId = oldToken._id;
	// 		Collections.appTokens.update({ _id: oldToken._id }, { $set: { token: reqBody.token, userId: user._id, createdAt: new Date() } }, { multi: false });
	// 	} else {
	// 		serverId = Collections.appTokens.insert({ token: reqBody.token, userId: user._id, createdAt: new Date() });
	// 	}

	// 	res.end(JSON.stringify({error: false, message: serverId, code: 200}));
	// });
}
