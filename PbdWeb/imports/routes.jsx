import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import SimpleSchema from 'simpl-schema';
import Collections from 'meteor/collections';

if(Meteor.isClient) {
	import React from 'react';
	import ReactDom from 'react-dom';

	import Login from './ui/components/Login';
	import Layout from './ui/components/Layout';
	import NavigationTabs from './ui/components/NavigationTabs';
	import NotFound from './ui/components/NotFound';

	import CurrentStatus from './ui/components/CurrentStatus';
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
							This is Reports Tab
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
							This is History Tab
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
							This is notifications Tab
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
				renderComponent(<div>This is Settings Page</div>);
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
	const autoIncrement = require('mongodb-autoincrement');

	Router.route('/api/testroute', {where: 'server'}).get(function(req, res, next) {
		console.log("This is testroute.");
		res.end("response from testroute. It is a get method.");
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
			lastUserDetails: timestamp<Long Int>,
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
			]
			notifications: timestamp<Long Int>
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
					case "followUps" : Collections.followUps.remove({ id: deletedDoc.serverId });
							break;

					case "tasks" : Collections.tasks.remove({ id: deletedDoc.serverId });
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

	const getUserDetails = async (user, lastUserDetails) => {
		if(lastUserDetails) {
			try {
				const dbUserUpdatedAt = moment(user.updatedAt).unix() * 1000;		//convert the timeStamps to milliseconds

				if(lastUserDetails < dbUserUpdatedAt) {		//if app's updatedAt is less than web's then only send app the updated values
					return {
						name: user.profile.name || "Unassigned",
						phoneNo: user.username,
						email: (user.emails && user.emails[user.emails.length - 1] && user.emails[user.emails.length - 1].address) || "Unknown",
						img: (user.profile.img && user.profile.img.split(",")[1]),
						address: user.profile.address || "Unknown",
						updatedAt: dbUserUpdatedAt
					}
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
						console.log("docs: " + JSON.stringify(docs));
						if(docs.length) {
							retData.upsert = docs[0].upsert;
							retData.remove = docs[0].remove;
						}
						resolve(retData);
					})
				})

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

	const storeFollowUps = async (userId, followUps) => {
		//if the locations key is defined.
		if(followUps) {
			// console.log("locations: " + JSON.stringify(locations));
			if(!Array.isArray(followUps)) {		//validate the locations array
				throw new Error("Error in the given followUps Array.");
				return;
			}

			return followUps.map((followUp, index) => {
				// console.log("followUp: " + JSON.stringify(followUp));
				let obj = {
					partyId: followUp.partyId,
					reminderDate: followUp.reminderDate,
					followUpFor: followUp.followUpFor,
					userId: userId,
					createdAt: followUp.createdAt
				}

				let serverId = followUp.serverId

				if(typeof serverId === "string") {
					Collections.followUps.update({ _id: serverId }, {$set: obj}, {multi: false}, (err, docs) => { 
						if(err) throw new Error(err.message)
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

		const userDetailsApi = getUserDetails(user, reqBody.lastUserDetails).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 500}));
			return;
		});

		const partyDetailsApi = getPartyDetails(user._id, reqBody.lastPartyDetails).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 500}));
			return;
		});

		const tasksApi = storeTasks(user._id, reqBody.tasks).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});

		const followUpsApi = storeFollowUps(user._id, reqBody.followUps).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});

		const callAllFuncs = async () => {
			const values = await Promise.all([deleteDocsApi, locationsApi, userDetailsApi, partyDetailsApi, tasksApi, followUpsApi]);

			console.log(`values: ${JSON.stringify(values)}`);
			const message = {
				deletedIds: values[0],
				locationIds: values[1],
				userDetails: values[2],
				partyDetails: values[3],
				taskIds: values[4],
				followUpIds: values[5]
			}
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
				partyId: String,
				cpName: String,
				cpNumber: Long,
				cpEmail: String,
				amount: Double,
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
				email: String,
				amount: Double,
				paidBy: 0, 1, 2
				chequeNo: String,
				ddNo: String,
				payment: 0, 1,
				serverId: String
			}",
			code: Integer
		}	if error is false then message is the apiKey for that user.
	*/

	const generateReceipt = async (userId, receiptDetails) => {
		if(!receiptDetails.partyId || (receiptDetails.partyId.length == 32)) {
			throw new Error("Invalid partyId.");
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

		if(receiptDetails.cpEmail && (receiptDetails.cpEmail != "")) {
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

		if((typeof receiptDetails.payment !== "number") || (receiptDetails.payment > 1 && receiptDetails.payment < 0)) {
			throw new Error("Please enter whether the payment is full or part.");
			return;
		}

		let details = new Promise((resolve, reject) => {
			const db = Collections.receipts.rawDatabase();
			autoIncrement.getNextSequence(db, "receipts", function (err, autoIndex) {
				if(err) {
					reject(new Error(err.message));
					return;
				}

		        var collection = db.collection("receipts");
		        collection.insert({
		        	receiptNo: autoIndex,
		        	partyId: receiptDetails.partyId,
		        	cpName: receiptDetails.cpName,
		        	cpNumber: receiptDetails.cpNumber,
		        	cpEmail: receiptDetails.cpEmail,
		        	amount: receiptDetails.amount,
		        	paidBy: receiptDetails.paidBy,
		        	chequeNo: receiptDetails.chequeNo,
		        	ddNo: receiptDetails.ddNo,
		        	payment: receiptDetails.payment,
		        	userId,
		        	createdAt: new Date()
		        }).then(result => {
			        console.log("result: " + JSON.stringify(result));
			        if(result.ops && result.ops[0]){
				        const retObj = {
				        	serverId: result.ops[0]._id,
				        	receiptNo: result.ops[0].receiptNo,
				        	partyId: result.ops[0].partyId,
				        	cpName: result.ops[0].cpName,
				        	cpNumber: result.ops[0].cpNumber,
				        	cpEmail: result.ops[0].cpEmail,
				        	amount: result.ops[0].amount,
				        	paidBy: result.ops[0].paidBy,
				        	chequeNo: result.ops[0].chequeNo,
				        	ddNo: result.ops[0].ddNo,
				        	payment: result.ops[0].payment,
				        	createdAt: moment(result.ops[0].createdAt).valueOf()
				        }

				        resolve(retObj);
			        } else {
			        	reject(new Error("Problem in insertion of receipt, please check the database."))
			        }
		        })
		    });
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
		
		const generateReceiptApi = generateReceipt(user._id, reqBody.receiptDetails).catch(err => {
			res.end(JSON.stringify({error: true, message: err.message, code: 400}));
			return;
		});

		const callAllFuncs = async () => {
			const values = await Promise.all([generateReceiptApi]);

			console.log(`values: ${JSON.stringify(values)}`);
			const message = { ...values[0] }
			res.end(JSON.stringify({ error: false, message, code: 200 }));
		}

		callAllFuncs().catch(error => {
			console.log("error: " + error);
			res.end(JSON.stringify({ error: true, message: error.message, code: 500 }));
		})
	})
}
