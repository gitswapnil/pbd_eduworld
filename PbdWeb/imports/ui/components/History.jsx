import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';
import { ReactiveVar } from 'meteor/reactive-var';

if(Meteor.isServer) {
	Meteor.publish('history.getExecutivesList', function(){
		console.log("Publishing the history.getExecutivesList...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			let initializing = true;		//flag to skip the huge loading during initial time.

			const handle = Meteor.users.find({}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(_id && Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "executive"})) {
						const userDoc = Meteor.users.findOne({ _id }, {fields: {"services": 0, apiKey: 0}});
						userDoc.isExecutive = true;
						this.added('users', _id, userDoc);		//just send the ids.
					}
				},
			});

			console.log("data publication for \"history.getExecutivesList is complete.\"");
			this.ready();
			this.onStop(() => {
				handle.stop();
				this.stop();
				console.log("Publication, \"history.getExecutivesList\" is stopped.");
			});
		} else {
			this.ready();
		}
	});

	Meteor.publish('history.getExecutiveHistory', function({ executiveId, skip, limit, searchCriterion }){
		console.log("Publishing the history.getExecutiveHistory...");
		console.log("executiveId: " + executiveId);
		console.log("skip: " + skip);
		console.log("limit: " + limit);
		console.log("searchCriterion: " + JSON.stringify(searchCriterion));

		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			let initializing = true;		//flag to skip the huge loading during initial time.

			let searchCondition = {};
			if(searchCriterion.searchDate) {
				searchCondition = {
					createdAt: {
						$gte: moment(searchCriterion.searchDate).startOf("day").toDate(),
						$lte: moment(searchCriterion.searchDate).endOf("day").toDate(),
					}
				}
			} else if(searchCriterion.category) {
				if(searchCriterion.category === "tasks") {
					searchCondition = {
						category: "task"
					} 
				} else if(searchCriterion.category === "followups") {
					searchCondition = {
						category: "followUp"
					}
				} else if(searchCriterion.category === "receipts") {
					searchCondition = {
						category: "receipt"
					}
				}
			} else if(searchCriterion.reason !== -1 ) {
				searchCondition = {
					$expr: { $or: [ { $eq: ["$followUpFor", searchCriterion.reason] }, { $and: [{ $eq: ["$type", 0] }, { $eq: ["$reason", searchCriterion.reason] }] } ] }
				}
			} else {
				searchCondition = {
					$expr: {
			            $or: [
			                { $regexMatch: { input: "$party.profile.name", regex: `${searchCriterion.string}`, options: "i" } },
			                { $regexMatch: { input: "$party.username", regex: `${searchCriterion.string}`, options: "i" } },
			                { $eq: ["$amount", parseFloat(searchCriterion.string)] },
			                { $regexMatch: { input: "$receiptNo", regex: `${searchCriterion.string}`, options: "i" } },
			                { $regexMatch: { input: "$subject", regex: `${searchCriterion.string}`, options: "i" } },
			            ]
			        }
				}
			}

			// console.log("searchCondition: " + JSON.stringify(searchCondition));

			const getHistory = async () => {
				const getData = (resolve, reject) => {
					Meteor.users.rawCollection().aggregate([
						{
					        $match: { _id: executiveId }
					    },
					    {
					        $lookup: {
					            from: "locations",
					            foreignField: "userId",
					            localField: "_id",
					            as: "locations"
					        }
					    },
					    {
					        $lookup: {
					            from: "tasks",
					            foreignField: "userId",
					            localField: "_id",
					            as: "tasks"
					        }
					    },
					    {
					        $lookup: {
					            from: "receipts",
					            foreignField: "userId",
					            localField: "_id",
					            as: "receipts"
					        }
					    },
					    {
					        $lookup: {
					            from: "followUps",
					            foreignField: "userId",
					            localField: "_id",
					            as: "followUps"
					        }
					    },
					    { $unwind: { path: "$followUps", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: "$_id",
                                userId: { $first: "$_id" },
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                services: { $first: "$services" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $first: "$tasks" },
                                receipts: { $first: "$receipts" },
                                followUps: { $addToSet: { $cond: [ { $not: "$followUps.followUpFor" }, null, "$followUps" ] } },
                                locations: { $first: "$locations" },
                            }
                        },
                        {
                            $unwind: { path: "$followUps", preserveNullAndEmptyArrays: true },
                        },
                        {
                            $project: {
                                _id: 1,
                                userId: 1,
                                active: 1,
                                createdAt: 1,
                                services: 1,
                                username: 1,
                                emails: 1,
                                apiKey: 1,
                                profile: 1,
                                updatedAt: 1,
                                tasks: 1,
                                receipts: 1,
                                followUps: { $cond: [{ $eq: ["$followUps", null] }, "$$REMOVE", "$followUps"]},
                                locations: 1,
                            }
                        },
                        {
                            $group: {
                                _id: "$_id",
                                userId: { $first: "$_id" },
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                services: { $first: "$services" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $first: "$tasks" },
                                receipts: { $first: "$receipts" },
                                followUps: { $addToSet: "$followUps" },
                                locations: { $first: "$locations" },
                            }
                        },
                        
                        
                        { $unwind: { path: "$tasks", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: "$_id",
                                userId: { $first: "$_id" },
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                services: { $first: "$services" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $addToSet: "$tasks" },
                                receipts: { $first: "$receipts" },
                                followUps: { $first: "$followUps" },
                                taskLocations: { 
                                    $addToSet: {
                                        "_id": null,
                                        "createdAt": "$tasks.createdAt"
                                    }
                                },
                                locations: { $first: "$locations" }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                userId: 1,
                                active: 1,
                                createdAt: 1,
                                services: 1,
                                username: 1,
                                emails: 1,
                                apiKey: 1,
                                profile: 1,
                                updatedAt: 1,
                                tasks: 1,
                                receipts: 1,
                                followUps: 1,
                                locations: { $concatArrays: ["$taskLocations", "$locations"] },
                            }
                        },
                        
                        { $unwind: { path: "$receipts", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: "$_id",
                                userId: { $first: "$_id" },
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                services: { $first: "$services" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $first: "$tasks" },
                                receipts: { $addToSet: "$receipts" },
                                followUps: { $first: "$followUps" },
                                receiptsLocations: { 
                                    $addToSet: {
                                        "_id": null,
                                        "createdAt": "$receipts.createdAt"
                                    }
                                },
                                locations: { $first: "$locations" }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                userId: 1,
                                active: 1,
                                createdAt: 1,
                                services: 1,
                                username: 1,
                                emails: 1,
                                apiKey: 1,
                                profile: 1,
                                updatedAt: 1,
                                tasks: 1,
                                receipts: 1,
                                followUps: 1,
                                locations: { $concatArrays: ["$receiptsLocations", "$locations"] },
                            }
                        },
                        
                        { $unwind: { path: "$followUps", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: "$_id",
                                userId: { $first: "$_id" },
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                services: { $first: "$services" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $first: "$tasks" },
                                receipts: { $first: "$receipts" },
                                followUps: { $addToSet: "$followUps" },
                                followUpsLocations: { 
                                    $addToSet: {
                                        "_id": null,
                                        "createdAt": "$followUps.createdAt"
                                    }
                                },
                                locations: { $first: "$locations" }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                userId: 1,
                                active: 1,
                                createdAt: 1,
                                services: 1,
                                username: 1,
                                emails: 1,
                                apiKey: 1,
                                profile: 1,
                                updatedAt: 1,
                                tasks: 1,
                                receipts: 1,
                                followUps: 1,
                                locations: { $concatArrays: ["$followUpsLocations", "$locations"] },
                            }
                        },
                        
                        
                        { $unwind: { path: "$locations", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 1,
                                userId: 1,
                                active: 1,
                                createdAt: 1,
                                username: 1,
                                emails: 1,
                                apiKey: 1,
                                profile: 1,
                                updatedAt: 1,
                                tasks: 1,
                                receipts: 1,
                                followUps: 1,
                                locationsCreatedAt: {
                                    $cond: [
                                        { $not: "$locations" },
                                        "$$REMOVE",
                                        { $dateToString: { date: "$locations.createdAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } }
                                    ]
                                },
                                locations: 1,
                            }
                        },
                        {
                            $match: {
                                "locationsCreatedAt": { $ne: null }
                            }
                        },
                        
                        
                        {
                            $group: {
                                _id: "$locationsCreatedAt",
                                userId: { $first: "$userId" },
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $first: "$tasks" },
                                receipts: { $first: "$receipts" },
                                followUps: { $first: "$followUps" },
                                locations: { $first: "$locations" },
                            }
                        },
                        {
                            $group: {
                                _id: "$userId",
                                active: { $first: "$active" },
                                createdAt: { $first: "$createdAt" },
                                username: { $first: "$username" },
                                emails: { $first: "$emails" },
                                apiKey: { $first: "$apiKey" },
                                profile: { $first: "$profile" },
                                updatedAt: { $first: "$updatedAt" },
                                tasks: { $first: "$tasks" },
                                receipts: { $first: "$receipts" },
                                followUps: { $first: "$followUps" },
                                locations: { $addToSet: "$locations" },
                            }
                        },
					    {
					        $project: {
					            _id: 1,
					            execProfile: "$profile",
					            history: { $concatArrays: ["$tasks", "$receipts", "$followUps", "$locations"] }
					        }
					    },
					    { $unwind: "$history" },
                        {
                            $match: {
                                "history._id": { $ne: null }
                            }
                        },
					    {
					        $project: {
					            _id: "$history._id",
					            execProfile: 1,
					            partyId: "$history.partyId",
					            taskId: "$history.taskId",
					            type: "$history.type",
					            cpName: "$history.cpName",
					            cpNumber: "$history.cpNumber",
					            reason: "$history.reason",
					            doneWithTask: "$history.doneWithTask",
					            reminder: "$history.reminder",
					            reminderDate: "$history.reminderDate",
					            followUpFor: "$history.followUpFor",
					            remarks: "$history.remarks",
					            subject: "$history.subject",
					            receiptNo: { $concat: ["$execProfile.receiptSeries", { $toString: "$history.receiptNo"} ] },
					            cpList: "$history.cpList",
					            amount: "$history.amount",
					            paidBy: "$history.paidBy",
					            ddNo: "$history.ddNo",
					            bankName: "$history.bankName",
					            bankBranch: "$history.bankBranch",
					            payment: "$history.payment",
					            chequeNo: "$history.chequeNo",
					            userId: "$history.userId",
                                receivedAt: "$history.receivedAt",
					            createdAt: { $ifNull: ["$history.createdAt", "$history"] },
					        }
					    },
					    {
					        $lookup: {
					            from: "users",
					            foreignField: "_id",
					            localField: "partyId",
					            as: "party",
					        }
					    },
					    {
					        $lookup: {
					            from: "followUps",
					            foreignField: "taskId",
					            localField: "_id",
					            as: "taksFollowUp",
					        }
					    },
					    {
					        $lookup: {
					            from: "tasks",
					            foreignField: "_id",
					            localField: "taskId",
					            as: "followUpTask",
					        }
					    },
					    { $unwind: { path: "$party", preserveNullAndEmptyArrays: true } },
					    {
					        $project: {
					            _id: 1,
					            execProfile: 1,
					            partyId: 1,
					            taskId: 1,
					            type: 1,
					            cpName: 1,
					            cpNumber: 1,
					            reason: 1,
					            doneWithTask: 1,
					            reminder: 1,
					            reminderDate: 1,
					            followUpFor: 1,
					            remarks: 1,
					            subject: 1,
					            receiptNo: { $cond: [{ $eq: ["$receiptNo", null] }, "$$REMOVE", "$receiptNo"]},
					            cpList: 1,
					            amount: { $cond: [{ $eq: ["$amount", null] }, "$$REMOVE", "$amount"]},
					            paidBy: 1,
					            ddNo: 1,
					            payment: 1,
					            chequeNo: 1,
					            bankName: 1,
					            bankBranch: 1,
					            "party._id": 1,
					            "party.username": 1,
					            "party.emails": 1,
					            "party.profile": { $ifNull: [ "$party.profile", { name: "", phoneNumber: "", address: "" } ] },
					            userId: 1,
                                receivedAt: 1,
					            createdAt: 1,
					            category: { 
					                $cond: [
					                    { $or: [ {$eq: ["$type", 0]}, {$eq: ["$type", 1]} ] }, 
					                    "task", 
					                    {
					                        $cond: [
					                            { $ifNull: ["$receiptNo", false] }, 
					                            "receipt",
                                                {
                                                    $cond: [
                                                        { $ifNull: ["$taskId", false] },
                                                        "followUp",
                                                        null
                                                    ]
                                                }
					                        ]
					                    }
					                ]
					            },
					            taskFollowUp: { $arrayElemAt: [ "$taksFollowUp", 0 ] },
					            followUpTask: { $arrayElemAt: [ "$followUpTask", 0 ] },
					        }
					    },
					    { $match: searchCondition },
					    { $sort: { "createdAt": -1 } },
					    // { $skip: skip },
					    { $limit: (skip + limit) },
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);
							// console.log("docs: " + JSON.stringify(docs));

							resolve.apply(this, [docs]);
						}).bind(this));
					}).bind(this));
				};

				const prmse = new Promise(getData.bind(this));

				const history = await prmse;

				return history;
				
			};

			const handle1 = Collections.tasks.find({ userId: executiveId }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(!initializing) {
						if(doc.type === 0) {
							doc.party = Meteor.users.findOne({ _id: doc.partyId }, { fields: { services: 0, availableTo: 0 } });
						}
						doc.category = "task";
						this.added("temp", _id, doc);
					}
				},

				changed: (_id, changedDoc) => {
					let doc = Collections.tasks.findOne({ _id });
					if(doc.type === 0) {
						doc.party = Meteor.users.findOne({ _id: doc.partyId }, { fields: { services: 0, availableTo: 0 } });
					}
					doc.category = "task";
                    delete doc._id;
					this.changed("temp", _id, doc);
				},

				removed: (_id) => {
					this.removed("temp", _id);
				}
			});

			const handle2 = Collections.receipts.find({ userId: executiveId }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(!initializing) {
						doc.receiptNo = `${Meteor.users.findOne({ _id: executiveId }).profile.receiptSeries}${doc.receiptNo}`;
						doc.amount = `${doc.amount}`;
						doc.party = Meteor.users.findOne({ _id: doc.partyId }, { fields: { services: 0, availableTo: 0 } });
						doc.category = "receipt";
						this.added("temp", _id, doc);
					}
				},

				changed: (_id, changedDoc) => {
					let doc = Collections.receipts.findOne({ _id });
					doc.receiptNo = `${Meteor.users.findOne({ _id: executiveId }).profile.receiptSeries}${doc.receiptNo}`;
					doc.amount = `${doc.amount}`;
					doc.party = Meteor.users.findOne({ _id: doc.partyId }, { fields: { services: 0, availableTo: 0 } });
					doc.category = "receipt";
                    delete doc._id;
					this.changed("temp", _id, doc);
				},

				removed: (_id) => {
					this.removed("temp", _id);
				}
			});

			const handle3 = Collections.followUps.find({ userId: executiveId }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(!initializing) {
						if(typeof doc.followUpFor !== "undefined") {
							doc.party = Meteor.users.findOne({ _id: doc.partyId }, { fields: { services: 0, availableTo: 0 } });
							doc.category = "followUp";
							this.added("temp", _id, doc);
						}
					}
				},

				changed: (_id, changedDoc) => {
					let doc = Collections.followUps.findOne({ _id });
					doc.party = Meteor.users.findOne({ _id: doc.partyId }, { fields: { services: 0, availableTo: 0 } });
					doc.category = "followUp";
                    delete doc._id;
					this.changed("temp", _id, doc);
				},

				removed: (_id) => {
					this.removed("temp", _id);
				}
			});

			getHistory.apply(this).then(docs => {			
                // console.log("docs: " + JSON.stringify(docs));
				docs.forEach((item, index) => {
					// console.log("createdAt: " + item.createdAt);
                    let _id = `${item._id}`;
                    // delete item._id;
                    // Collections.temp.upsert({ _id }, { $set: { ...item } });

                    // if((index + 1) > skip) {
                        // console.log("item: " + JSON.stringify(item));
    					this.added("temp", _id, item);
                    // }
				});

				initializing = false;
				this.ready();
			}).catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			console.log("data publication for \"history.getExecutiveHistory is complete.\"");
			this.onStop(() => {
				handle1.stop();
				handle2.stop();
				handle3.stop();
                // Collections.temp.remove({});
				this.stop();
				console.log("Publication, \"history.getExecutiveHistory\" is stopped.");
			});
		} else {
			this.ready();
		}
	});
}

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
    'history.receipts.markPaymentReceived'(editId) {        //if editId is given, then it is a method to edit the executive's details.
        console.log("history.receipts.markPaymentReceived method with editId: " + (editId || "undefined"));

        if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {      //authorization
            if(editId || editId !== "") {       //if edit method
                if(!Collections.receipts.findOne({"_id": editId})){         //check if the edit Id is genuine or not.
                    throw new Meteor.Error(400, "general-error", "{\"generalError\":\"Invalid ReceiptId\"}");
                    return;
                };

                console.log("Saving the changes for receipt with _id: " + editId + "...");
                Collections.receipts.update({"_id": editId}, { $set: { "receivedAt": new Date() } }, {multi: false, upsert: false});
            } else {
                throw new Meteor.Error(400, "general-error", "{\"generalError\":\"Invalid ReceiptId\"}");
            }
        }

        console.log("history.receipts.markPaymentReceived method is completed successfully.");
        return "Receipt marked as paid successfully";
    },
});


if(Meteor.isClient) {
	import React, { useState, useEffect, useRef } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faSearch, 
             faCircleNotch, 
             faCheck, 
             faTimes, 
             faExclamationTriangle, 
             faPrint,
             faStamp } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import { 	getReasonFromCode, 
				getCodeFromReason,
				PBD_NAME,
				PBD_ADDRESS,
				PBD_EMAIL,
				PBD_PHONE1,
				PBD_PHONE2,
				PBD_MOBILE1,
				PBD_MOBILE2 } from 'meteor/pbd-apis';
	import ExecutiveDaySnapshot from './ExecutiveDaySnapshot';
    import Modal from './Modal.jsx';

	const ExecutivesList = (props) => {
		const [executives, setExecutives] = useState([]);
		const [selectedExec, setSelectedExec] = useState("0");
		const [loading, setLoading] = useState(true);

		useEffect(() => {
			const handle = Meteor.subscribe('history.getExecutivesList', {
				onStop(error) {
					console.log("history.getExecutivesList is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("history.getExecutivesList is ready to get the data.");
					const execs = Meteor.users.find({"isExecutive": true}).fetch();

					setExecutives(execs);

					if(execs[0]) {
						setSelectedExec(execs[0]._id);
						props.onExecutiveSelection(execs[0]._id);
					} else {
						props.onExecutiveSelection("1");		//send 1 when no executives are present
					}

					setLoading(false);


					this.stop();
				}
			});

			return function() {
				handle.stop();
			}
		}, []);

		return 	<div className="list-group history-list" role="tablist">
					{
						loading ?
						<div className="text-center"><FontAwesomeIcon icon={faCircleNotch} spin/> Loading...</div>
						:
						executives && (executives.length !== 0) ?
						executives.map(executive => 
							<a 	href="#" 
								key={executive._id}
								className={`list-group-item list-group-item-action ${(executive._id === selectedExec) ? "active" : ""}`}
								onClick={() => {
									setSelectedExec(executive._id);
									props.onExecutiveSelection(executive._id);
								}}>
								{executive.profile.name}
							</a>
						)
						: 
						<div className="text-center">No Executives Present</div>
					}
				</div>
	};

	const ExecutiveHistory = (props) => {
		const [listItems, setListItems] = useState([{ _id: "ABCD", category: "loading" }]);
		const [selectedItemId, setSelectedItemId] = useState("0");
		const [selectedExecutiveId, setSelectedExecutiveId] = useState("0");
		const [searchString, setSearchString] = useState("");
		const [skip, setSkip] = useState(0);
		const [loading, setLoading] = useState(false);
		const limit = 10;
		const [lazyLoaderTrigger, setLazyLoaderTrigger] = useState(0);

		const getSearchCriteria = () => {
			let string = searchString.toLowerCase();

			let retObj ={
				searchDate: false,
				category: false,
				reason: -1,
				string
			};

			if(/^(0[1-9]|[1-2][0-9]|3[0-1])-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(20[2-9][0-9])$/.test(string)){
				retObj.searchDate = moment(string, "DD-MMM-YYYY").toDate();
			} else if(/^(0[1-9]|[1-2][0-9]|3[0-1])\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/(20[2-9][0-9])$/.test(string)){
				retObj.searchDate = moment(string, "DD/MMM/YYYY").toDate();
			} else if(/^(0[1-9]|[1-2][0-9]|3[0-1])-(0[1-9]|1[0-2])-(20[2-9][0-9])$/.test(string)) {
				retObj.searchDate = moment(string, "DD-MM-YYYY").toDate();
			} else if(/^(0[1-9]|[1-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/(20[2-9][0-9])$/.test(string)) {
				retObj.searchDate = moment(string, "DD/MM/YYYY").toDate();
			} else if(/^([1-9]|[1-2][0-9]|3[0-1])-([1-9]|1[0-2])-(20[2-9][0-9])$/.test(string)) {
				retObj.searchDate = moment(string, "D-M-YYYY").toDate();
			} else if(/^([1-9]|[1-2][0-9]|3[0-1])\/([1-9]|1[0-2])\/(20[2-9][0-9])$/.test(string)) {
				retObj.searchDate = moment(string, "D/M/YYYY").toDate();
			} else if(/^(task|followup|follow up|receipt|followups|follow ups|receipts|tasks)$/.test(string)) {
				if(/^(task|tasks)$/.test(string)) {
					retObj.category = "tasks";
				} else if(/^(followup|follow up|followups|follow ups)$/.test(string)) {
					retObj.category = "followups";
				} else if(/^(receipt|receipts)$/.test(string)) {
					retObj.category = "receipts";
				}
			} else if(getCodeFromReason(string) !== -1) {
				retObj.reason = getCodeFromReason(string);
			}

			return retObj;
		};

		const loadLazily = () => {
			if(!loading) {
				const listContainer = this.historyList;
				if((listContainer.scrollTop + listContainer.clientHeight) === listContainer.scrollHeight) {
					setListItems( [...listItems].concat([{ _id: "ABCD", category: "loading" }]) );
					setSkip(listItems.length);
					setLazyLoaderTrigger(lazyLoaderTrigger + 1);
					console.log("reached to bottom...");
				}
			}
		};

		useEffect(() => {
			if(props.selectedExecutiveId !== selectedExecutiveId) {
				if(props.setSelectedExecutiveId === "1") {
					setListItems([]);
				} else {
					setSkip(0);
					setListItems([{ _id: "ABCD", category: "loading" }]);
					Collections.null.remove({});
					setSelectedItemId("0");
					setSelectedExecutiveId(props.selectedExecutiveId);
				}
			}
		}, [props.selectedExecutiveId]);

        const getSelectedItemId = () => selectedItemId;

		useEffect(() => {
			const searchCriterion = getSearchCriteria();

			if(!loading && (selectedExecutiveId !== "0")) {
				setLoading(true);

				let handle = Meteor.subscribe('history.getExecutiveHistory', { executiveId: selectedExecutiveId, skip, limit, searchCriterion });

				Tracker.autorun(() => {
					if(handle.ready()) {
                        setTimeout(function() {

    						let data = [];
    						// data.splice(-1, 1);
    						Collections.temp.find({}).forEach((serverItem, i) => {
    							// console.log("got createdAt: " + serverItem.createdAt);
                                let _id = serverItem._id;
    							data.push(serverItem);
    							Collections.null.upsert({ _id }, { $set: { ...serverItem } });
    						});

    						data.sort((a, b) => (b.createdAt - a.createdAt));

                            // console.log("data: " + JSON.stringify(Collections.temp.find({}).fetch()));

                            // console.log("selectedItemId: " + getSelectedItemId());
                            // console.log("data.length: " + data.length);

    						setListItems(data);
    						setLoading(false);

    						if((getSelectedItemId() === "0") && data.length) {
    							const nonNullCategoryItem = data.find(elem => (elem.category != null));
    							if(nonNullCategoryItem) {
    								setSelectedItemId(nonNullCategoryItem._id);
    							}
    						}

                            props.refreshDetailsPage(Date().toString());        //refresh the details page after updating the local database.

                        }, 500);
					}
				});

				return function() {
                    console.log("Publication history.getExecutiveHistory is stopped.");
					handle.stop();
				}
			} else {
				return;
			}
		}, [skip, selectedExecutiveId, lazyLoaderTrigger]);

		useEffect(() => {
			props.onHistoryItemSelection(selectedItemId);
		}, [selectedItemId]);

		return 	<React.Fragment>
					<form onSubmit={(e) => { 
							e.preventDefault(); 
							setSkip(0);
							setListItems([{ _id: "ABCD", category: "loading" }]);
							Collections.null.remove({});
							setSelectedItemId("0");
							setLazyLoaderTrigger(lazyLoaderTrigger + 1);
						}}>
						<div className="input-group">
							<div className="input-group-prepend">
							    <span className="input-group-text" id="basic-addon1" style={{ background: "#fff" }}>
									<FontAwesomeIcon icon={faSearch} />
							    </span>
							</div>
						  	<input type="text" className="form-control" placeholder="Search keyword" aria-label="search keyword" style={{ borderLeft: "none" }} value={searchString} onChange={(e) => { setSearchString(e.target.value) }}/>
							<div className="input-group-append">
								<button className="btn btn-outline-secondary" type="submit" style={{ border: "1px solid #ced4da" }}>Search</button>
							</div>
						</div>
					</form>
					<div className="list-group history-list" ref={ref => this.historyList = ref} onScroll={loadLazily.bind(this)}>
						{
							listItems && (listItems.length !== 0) ?
							(() => {
								let prevDate;

								return listItems.map(item => {
									// console.log("item: " + JSON.stringify(item));
									let dateRow = "";
									if(item.createdAt) {
										const date = moment(item.createdAt).format("DD-MMM-YYYY");
										if(prevDate !== date) {
											prevDate = date;
											dateRow = 	<div className="history-date-title">
															<div><b>{date}</b></div>
															<div>
																<button className="btn btn-info" style={{ borderRadius: 0, fontSize: "small" }} onClick={() => setSelectedItemId(`${moment(item.createdAt).format("DD-MM-YYYY")}:${item.userId}`)}>Day Report</button>
															</div>
														</div>
										}
									}

									return 	<React.Fragment key={item._id}>
												{ dateRow }
												{
													(item.category != null) ? 

													<a 	href="#" 
														className={`list-group-item custom-list-group-item list-group-item-action ${(item._id === selectedItemId) ? "active" : ""}`}
														onClick={() => setSelectedItemId(item._id)}
														disabled={(item.category === "loading")}>
														{
															(item.category === "task") ? 
															<div>
																<div className="text-primary">{ (item.type === 0) ? "Task" : "Other Task" }</div>
																<div style={{ fontSize: "smaller" }}>{ (item.type === 0) ? getReasonFromCode(item.reason) : item.subject}</div>
																<div style={{ fontSize: "large" }}>{(item.party) ? (item.party.profile.name).substring(0, 30) : (item.subject).substring(0, 30)}</div>
															</div>
															: 
															(item.category === "receipt") ? 
															<div style={
                                                                    Object.assign({}, item.receivedAt ? {  
                                                                        backgroundImage: "url('/paid-icon-list.png')",
                                                                        backgroundRepeat: "no-repeat",
                                                                        backgroundPositionY: "center",
                                                                        backgroundPositionX: "center",
                                                                        backgroundSize: "contain"
                                                                    } : {})}>
																<div style={{color: "#BE7A04"}}>Receipt</div>
																<div style={{ fontSize: "smaller", fontWeight: "bold" }}>₹ 
																	{
																		(() => {
																			let numStr = (parseFloat(item.amount) + 0.00001).toString().split(".");
																			return `${numStr[0]}.${numStr[1].slice(0, 2)}`
																		})()
																	}
																</div>
																<div style={{ fontSize: "large" }}>{(item.party) ? (item.party.profile.name).substring(0, 30) : ""}</div>
															</div>
															:
															((item.category === "followUp") || (typeof item.followUpFor !== "undefined")) ? 
															<div>
																<div style={{ color: "#DA2D6D" }}>Follow up</div>
																<div style={{ fontSize: "smaller" }}>{getReasonFromCode(item.followUpFor)}</div>
																<div style={{ fontSize: "large" }}>{(item.party) ? (item.party.profile.name).substring(0, 30) : ""}</div>
															</div>
															: 
															(item.category === "loading") ?
															<div>
																<div className="text-center" style={{ fontSize: "large" }}>
																	<FontAwesomeIcon icon={faCircleNotch} spin/> Loading...
																</div>
															</div>
															: 
															(item.category === "endOfList") ?
															<div>
																<div className="text-center" style={{ fontSize: "large" }}>
																	End of list is reached
																</div>
															</div>
															: null
														}
														
													</a>
													:
													null
												}
											</React.Fragment>

								})
							})()
							: 
							<div className="text-center">No History Present</div>
						}
					</div>
				</React.Fragment>
	};

	const ItemDetails = (props) => {
        // const [refresh, setRefresh] = useState("0");

		if(!props.itemId) {
			return <div></div>;
		}

		let splittedString = props.itemId.split(":");
		let itemId = splittedString[0];
		let execId = splittedString[1];

		if(execId){
			return <ExecutiveDaySnapshot execId={execId} date={moment(itemId, "DD-MM-YYYY").toDate()}/>;
		};

		let itemDetails = Collections.null.findOne({ _id: itemId });

        useEffect(() => {
            itemDetails = Collections.null.findOne({ _id: itemId });
            // setRefresh(props.refreshTrigger);
        }, [props.refreshTrigger]);

		// console.log("itemDetails: " + JSON.stringify(itemDetails));

		if(!itemDetails) {
			return <div></div>;
		}

		const TaskDetails = (props) => {
			const details = props.details;

			return <div className="task-details-block">
						<table className="table table-bordered">
							<tbody>
								{
									(details.type === 0) ?

									<React.Fragment>
										<tr>
											<td>Visited to:</td>
											<td><b>{details.party.profile.name}</b><br/>{details.party.profile.address}</td>
										</tr>
										<tr>
											<td>Reason for visit:</td>
											<td>{getReasonFromCode(details.reason)}</td>
										</tr>
										<tr>
											<td>Contact Person:</td>
											<td>{(!details.cpName || (details.cpName === "")) ? <span>---</span> : details.cpName}</td>
										</tr>
										<tr>
											<td>Phone Number:</td>
											<td>{(!details.cpNumber || (details.cpNumber === "")) ? <span>---</span> : details.cpNumber}</td>
										</tr>
										<tr>
											<td>
												Done with {(details.reason === 0) ? "Sampling" : (details.reason === 1) ? "Receiving order" : "Payment" }:
											</td>
											<td>
											{
												details.doneWithTask ? 
													<FontAwesomeIcon icon={faCheck}/> : 
													<FontAwesomeIcon icon={faTimes}/>
											}
											</td>
										</tr>
										<tr>
											<td>Follow up reminder set on: </td>
											<td>
												{
													(details.taskFollowUp && details.taskFollowUp.reminderDate) ?
													moment(details.taskFollowUp.reminderDate).format("DD-MMM-YYYY") : <span>---</span>
												}
											</td>
										</tr>
										<tr>
											<td>Remarks: </td>
											<td>{(!details.remarks || (details.remarks == "")) ? "---" : details.remarks}</td>
										</tr>
									</React.Fragment>

									:

									<React.Fragment>
										<tr>
											<td>Subject: </td>
											<td>{details.subject}</td>
										</tr>
										<tr>
											<td>Remarks: </td>
											<td>{(!details.remarks || (details.remarks == "")) ? "---" : details.remarks}</td>
										</tr>
									</React.Fragment>
								}
							</tbody>
						</table>
						<p style={{ fontSize: "small", color: "#aaa" }}>
							Task created At: {moment(details.createdAt).format("DD-MMM-YYYY HH:mm")}
						</p>
					</div>;
		};

		const FollowUpDetails = (props) => {
			const details = props.details;

			return <div className="followUp-details-block">
						<table className="table table-bordered">
							<tbody>
								<tr>
									<td>Party Name:</td>
									<td><b>{details.party.profile.name}</b><br/>{details.party.profile.address}</td>
								</tr>
								<tr>
									<td>Contact Person:</td>
									<td>{(!details.followUpTask.cpName || (details.followUpTask.cpName === "")) ? <span>---</span> : details.followUpTask.cpName}</td>
								</tr>
								<tr>
									<td>Phone Number:</td>
									<td>{(!details.followUpTask.cpNumber || (details.followUpTask.cpNumber === "")) ? <span>---</span> : details.followUpTask.cpNumber}</td>
								</tr>
								<tr>
									<td>Reminder set on: </td>
									<td>
										{
											(details.reminderDate) ?
											moment(details.reminderDate).format("DD-MMM-YYYY") : <span>---</span>
										}
									</td>
								</tr>
								<tr>
									<td>Follow up for: </td>
									<td>{getReasonFromCode(details.followUpFor)}</td>
								</tr>
							</tbody>
						</table>
						<p style={{ fontSize: "small", color: "#aaa" }}>
							Follow up created At: {moment(details.createdAt).format("DD-MMM-YYYY HH:mm")}
						</p>
					</div>;
		};

		const ReceiptDetails = (props) => {
			const details = props.details;
            const [showModal, setShowModal] = useState(false);
            const [generalError, setGeneralError] = useState("");

			function closePrint() {
				document.body.removeChild(this.__container__);
			}

			function setPrint() {
				this.contentWindow.__container__ = this;
				this.contentWindow.onbeforeunload = closePrint.bind(this);
				this.contentWindow.onafterprint = closePrint.bind(this);
				this.contentWindow.focus(); // Required for IE
				this.contentWindow.print();
			}

			function printPage(sURL) {
				var oHiddFrame = document.createElement("iframe");
				oHiddFrame.onload = setPrint;
				oHiddFrame.style.position = "fixed";
				oHiddFrame.style.right = "0";
				oHiddFrame.style.bottom = "0";
				oHiddFrame.style.width = "0";
				oHiddFrame.style.height = "0";
				oHiddFrame.style.border = "0";

				const receiptDetailsBlock = document.getElementsByClassName("receipt-details-block")[0];
				const virtualBlock = document.createElement("div");
				virtualBlock.innerHTML = receiptDetailsBlock.innerHTML;

				virtualBlock.style.padding = "20px";
				virtualBlock.style.textAlign = "center";
				virtualBlock.style.color = "#555";
				virtualBlock.style.marginBottom = "20px";

				virtualBlock.removeChild(virtualBlock.querySelector("#btnPrint"));
				virtualBlock.removeChild(virtualBlock.querySelector("#cpList"));
				oHiddFrame.srcdoc = virtualBlock.outerHTML;

				document.body.appendChild(oHiddFrame);
			}

            function removeAllErrors() {
                setGeneralError("");
            }

            function clearModal() {
                setShowModal(false);
                removeAllErrors();
            }

            function markPaymentReceived() {
                const editId = details._id;
                console.log("receiptId: " + details._id);

                Tracker.autorun(() => {
                    removeAllErrors();          //remove all the errors before setting the new messages.
                    const errorObj = JSON.parse(reactiveError.get());
                    // console.log("errorObj: " + JSON.stringify(errorObj));
                    for(let [key, value] of Object.entries(errorObj)) {
                        switch(key) {
                            case "generalError": setGeneralError(value); break;
                        }
                    }
                });

                Meteor.apply('history.receipts.markPaymentReceived', 
                    [editId], 
                    {returnStubValues: true, throwStubExceptions: true}, 
                    (err, res) => {
                        // console.log("err: " + err);
                        if(err){
                            if(err.reason == "general-error") {      //if validation error occurs
                                // console.log("err.details: " + err.details);
                                reactiveError.set(err.details);
                            }
                        } else {        //when success, 
                            // console.log("res: " + res);
                            clearModal();
                        }
                    });
            }

			return 	<div className="receipt-details-block" style={
                                                            Object.assign({ boxShadow: "1px 1px 5px #aaa", 
                                                                            padding: "20px", 
                                                                            textAlign: "center", 
                                                                            color: "#555", 
                                                                            marginBottom: "20px",
                                                                        }, (typeof details.receivedAt == "object") ? {
                                                                            backgroundImage: "url('/paid-icon.png')",
                                                                            backgroundRepeat: "no-repeat",
                                                                            backgroundSize: "contain",
                                                                            backgroundPositionY: "top" 
                                                                        } : {})}>
                        <h5><b>{PBD_NAME}</b></h5>
						<div style={{ fontSize: "small" }}>{PBD_ADDRESS}</div>
						<div style={{ fontSize: "small" }}><b>Email: </b>{PBD_EMAIL}</div>
						<div style={{ fontSize: "small" }}><b>Phone: </b>{PBD_PHONE1}, {PBD_PHONE2}</div>
						<div style={{ fontSize: "small" }}><b>Mobile: </b>{PBD_MOBILE1}, {PBD_MOBILE2}</div>
						<table className="receipt-details-table" style={{ width: "100%", marginTop: "10px" }}>
							<tbody>
								<tr>
									<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Representative:</td>
									<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.execProfile.name}</td>
								</tr>
								<tr>
									<td style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Receipt No.:</td>
									<td style={{ borderBottom: "1px solid #ddd", textAlign: "right", color: "#000" }}>{details.receiptNo}</td>
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
										<h4>₹
											{(() => {
												let numStr = (parseFloat(details.amount) + 0.00001).toString().split(".");
												return `${numStr[0]}.${numStr[1].slice(0, 2)}`
											})()}
										</h4>
									</td>
								</tr>
							</tbody>
						</table>
						<div style={{ fontSize: "small" }}>Receipt is valid subject to realization of Cheque</div>
						<div id="cpList" style={{ fontSize: "small" }}>
							<div>This receipt is sent to:</div>
							{
								details.cpList.map(cp => {
									return <div key={cp.createdAt.toString()}>{cp.cpNumber}, ({cp.cpName}) at {moment(cp.createdAt).format("DD/MM/YY HH:mm")}</div>
								})
							}
						</div>
						<br/>
						<div id="btnPrint">
							<button className="btn btn-outline-secondary" onClick={printPage.bind(this)}>
                                <FontAwesomeIcon icon={faPrint}/> Print Receipt
                            </button>
                            {/*--- Mark Receipt Received confirmation Modal ----*/}
                            <Modal  show={showModal} 
                                    onHide={clearModal} 
                                    customOkButton={<button className="btn btn-warning" onClick={() => markPaymentReceived()}>Yes</button>}>
                                <Modal.Title>
                                    <FontAwesomeIcon icon={faExclamationTriangle}/> Warning
                                </Modal.Title>

                                <Modal.Body>
                                    <div className="modal-body" style={{"fontSize": "18px"}}>
                                        Once the payment is marked as <b>Received</b>, the operation cannot be undone.<br/>
                                        Are you sure you want to mark this payment as received?
                                    </div>
                                    <small className="form-text text-danger text-center">
                                        {generalError}
                                    </small>
                                </Modal.Body>
                            </Modal>
                            <br/> 
                            {
                                (typeof details.receivedAt != "object") ?
                                <button className="btn btn-outline-danger" onClick={() => setShowModal(true)}>
                                    <FontAwesomeIcon icon={faStamp}/> Mark Received
                                </button>
                                : null
                            }
						</div>
					</div>
		};

		let retObj = <div></div>;

		if(itemDetails.category === "task") {

			retObj = <TaskDetails details={itemDetails}/>

		} else if(itemDetails.category === "receipt") {

			retObj = <ReceiptDetails details={itemDetails}/>

		} else if(itemDetails.category === "followUp") {

			retObj = <FollowUpDetails details={itemDetails}/>

		}

		return retObj;
	};

	const History = (props) => {
		const [selectedExecutiveId, setSelectedExecutiveId] = useState("0");
		const [selectedHistoryItemId, setSelectedHistoryItemId] = useState();
        const [refreshDetailsPageCode, setRefreshDetailsPageCode] = useState("0");

		onExecutiveSelection = (executiveId) => {
			setSelectedExecutiveId(executiveId);
		}

		onHistoryItemSelection = (itemId) => {
			setSelectedHistoryItemId(itemId);
		}

        refreshDetailsPage = (code) => {
            setRefreshDetailsPageCode(code);
        }

		useEffect(() => {
			$(".tabs-content-container").css({ padding: "0 0 0 20px" });

			return function() {
				$(".tabs-content-container").css({ padding: "0 20px" });
			}
		}, [])

		return <div style={{ height: "100%" }}>
			<div className="container-fluid" style={{ height: "100%" }}>
				<div className="row" style={{ height: "100%" }}>
					<div className="col-2 history-executive-list">
						<ExecutivesList onExecutiveSelection={onExecutiveSelection.bind(this)}/>
					</div>
					<div className="col-4 history-details-list">
						<ExecutiveHistory   selectedExecutiveId={selectedExecutiveId} 
                                            onHistoryItemSelection={onHistoryItemSelection.bind(this)}
                                            refreshDetailsPage={refreshDetailsPage.bind(this)} />
					</div>
					<div className="col-6 history-details" style={{ height: "100%" }}>
						<ItemDetails itemId={selectedHistoryItemId} refreshTrigger={refreshDetailsPageCode}/>
					</div>
				</div>
			</div>
		</div>
	};

	export default History;
}
