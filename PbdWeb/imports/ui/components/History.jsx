import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';

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
						if(userDoc.active) {
							this.added('users', _id, userDoc);		//just send the ids.
						}
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
		console.log("searchCriterion: " + searchCriterion);

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
			                { $regexMatch: { input: "$amount", regex: `^${searchCriterion.string}$`, options: "i" } },
			                { $regexMatch: { input: "$receiptNo", regex: `${searchCriterion.string}`, options: "i" } },
			                { $regexMatch: { input: "$subject", regex: `${searchCriterion.string}`, options: "i" } },
			            ]
			        }
				}
			}

			console.log("searchCondition: " + JSON.stringify(searchCondition));

			const getHistory = async () => {
				const getData = (resolve, reject) => {
					Meteor.users.rawCollection().aggregate([
						{
					        $match: { _id: executiveId }
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
					    { $unwind: "$followUps" },
                        {
                            $match: {
                                "followUps.followUpFor": { $exists: true }
                            }
                        },
                        {
                            $group: {
                                _id: "$_id",
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
                                followUps: { $addToSet: "$followUps" }
                            }
                        },
					    {
                            $match: {
                                "followUps.followUpFor": { $exists: true }
                            }
                        },
					    {
					        $project: {
					            _id: 1,
					            execProfile: "$profile",
					            history: { $concatArrays: ["$tasks", "$receipts", "$followUps"] }
					        }
					    },
					    { $unwind: "$history" },
					    {
					        $project: {
					            _id: "$history._id",
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
					            amount: { $toString: "$history.amount" },
					            paidBy: "$history.paidBy",
					            ddNo: "$history.ddNo",
					            payment: "$history.payment",
					            chequeNo: "$history.chequeNo",
					            userId: "$history.userId",
					            createdAt: "$history.createdAt",
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
					    { $unwind: { path: "$party", preserveNullAndEmptyArrays: true } },
					    {
					        $project: {
					            _id: 1,
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
					            "party._id": 1,
					            "party.username": 1,
					            "party.emails": 1,
					            "party.profile": 1,
					            userId: 1,
					            createdAt: 1,
					            category: { 
					                $cond: [
					                    { $or: [ {$eq: ["$type", 0]}, {$eq: ["$type", 1]} ] }, 
					                    "task", 
					                    {
					                        $cond: [
					                            { $ifNull: ["$receiptNo", false] }, 
					                            "receipt",
					                            "followUp"
					                        ]
					                    }
					                ]
					            }
					        }
					    },
					    { $match: searchCondition },
					    { $sort: { "createdAt": -1 } },
					    { $skip: skip },
					    { $limit: limit },
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);
							console.log("docs: " + JSON.stringify(docs));

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
					this.changed("temp", _id, doc);
				},

				removed: (_id) => {
					this.removed("temp", _id);
				}
			});

			getHistory.apply(this).then(docs => {			
				docs.forEach(item => {
					this.added("temp", item._id, item);
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
				this.stop();
				console.log("Publication, \"history.getExecutiveHistory\" is stopped.");
			});
		} else {
			this.ready();
		}
	});
}

if(Meteor.isClient) {
	import React, { useState, useEffect, useRef } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faSearch, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import { getReasonFromCode, getCodeFromReason } from 'meteor/pbd-apis';

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
					setSelectedExec(execs[0]._id);
					props.onExecutiveSelection(execs[0]._id);
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
		const [searchStart, setSearchStart] = useState("");
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

		const ref = useRef(searchStart);

		useEffect(() => {
			if(props.selectedExecutiveId !== selectedExecutiveId) {
				setSkip(0);
				setListItems([{ _id: "ABCD", category: "loading" }]);
				setSelectedItemId("0");
				setSelectedExecutiveId(props.selectedExecutiveId);
			}
		}, [props.selectedExecutiveId]);

		useEffect(() => {
			const searchCriterion = getSearchCriteria();

			if(!loading && (selectedExecutiveId !== "0")) {
				setLoading(true);
				let handle = Meteor.subscribe('history.getExecutiveHistory', { executiveId: selectedExecutiveId, skip, limit, searchCriterion }, {
					onStop(error) {
						console.log("history.getExecutiveHistory is stopped.");
						if(error) {
							console.log(error);
						}
					},

					onReady() {
						console.log("history.getExecutiveHistory is ready to get the data.");
					}
				});

				Tracker.autorun(() => {
					if(handle.ready()) {
						let data = [...listItems];
						data.splice(-1, 1);

						const tempList = Collections.temp.find({}).fetch();
						console.log("tempList: " + JSON.stringify(tempList));

						Collections.temp.find({}).forEach((serverItem, i) => {
							data.push(serverItem);
						});

						data.sort((a, b) => (b.createdAt - a.createdAt));

						setListItems(data);
						setLoading(false);

						if((selectedItemId === "0") && data.length) {
							setSelectedItemId(data[0]._id);
						}

						ref.current = { searchStart };
					}
				});

				return function() {
					handle.stop();
				}
			} else {
				return;
			}
		}, [skip, selectedExecutiveId, searchStart, lazyLoaderTrigger]);

		return 	<React.Fragment>
					<form onSubmit={(e) => { 
							e.preventDefault(); 
							setListItems([{ _id: "ABCD", category: "loading" }]);
							setSearchStart(searchString); 
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
																<button className="btn btn-info" style={{ borderRadius: 0, fontSize: "small" }}>Snapshot</button>
															</div>
														</div>
										}
									}

									return 	<React.Fragment key={item._id}>
												{ dateRow }
												<a 	href="#" 
													className={`list-group-item custom-list-group-item list-group-item-action ${(item._id === selectedItemId) ? "active" : ""}`}
													onClick={() => {
														setSelectedItemId(item._id);
														props.onHistoryItemSelection(item._id);
													}}
													disabled={(item.category === "loading")}>
													{
														(item.category === "task") ? 
														<div>
															<div className="text-primary">Task</div>
															<div style={{ fontSize: "smaller" }}>{ item.party ? getReasonFromCode(item.reason) : null}</div>
															<div style={{ fontSize: "large" }}>{(item.party) ? (item.party.profile.name).substring(0, 30) : (item.subject).substring(0, 30)}</div>
														</div>
														: 
														(item.category === "receipt") ? 
														<div>
															<div style={{ color: "#BE7A04" }}>Receipt</div>
															<div style={{ fontSize: "smaller" }}>₹ {item.amount}</div>
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
											</React.Fragment>

								})
							})()
							: 
							<div className="text-center">No History Present</div>
						}
					</div>
				</React.Fragment>
	};

	const History = (props) => {
		const [selectedExecutiveId, setSelectedExecutiveId] = useState("0");
		const [selectedHistoryItem, setSelectedHistoryItem] = useState();

		onExecutiveSelection = (executiveId) => {
			setSelectedExecutiveId(executiveId);
		}

		return <div style={{ height: "100%" }}>
			<div className="container-fluid" style={{ height: "100%" }}>
				<div className="row" style={{ height: "100%" }}>
					<div className="col-2 history-executive-list">
						<ExecutivesList onExecutiveSelection={onExecutiveSelection.bind(this)}/>
					</div>
					<div className="col-4 history-details-list">
						<ExecutiveHistory selectedExecutiveId={selectedExecutiveId}/>
					</div>
					<div className="col-6" style={{border: "1px solid black"}}>

					</div>
				</div>
			</div>
		</div>
	};

	export default History;
}
