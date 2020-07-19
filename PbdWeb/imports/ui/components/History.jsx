import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	Meteor.publish('history.getExecutivesList', function(){
		console.log("Publishing the history.getExecutivesList...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			let userIds = [];
			let initializing = true;		//flag to skip the huge loading during initial time.

			const handle = Meteor.users.find({}).observeChanges({
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
			});

			console.log("data publication for \"history.getExecutivesList is complete.\"");
			this.ready();
			this.onStop(() => {
				handle.stop();
				console.log("Publication, \"history.getExecutivesList\" is stopped.");
			});
		} else {
			this.ready();
		}
	});

	Meteor.publish('history.getExecutiveHistory', function({ executiveId, skip, limit, keyword }){
		console.log("Publishing the history.getExecutiveHistory...");
		console.log("executiveId: " + executiveId);
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			let userIds = [];
			let initializing = true;		//flag to skip the huge loading during initial time.

			const getHistory = () => {
				let tasks = Collections.tasks.find({ userId: executiveId }, { sort: { createdAt: -1 } }).fetch();
				let receipts = Collections.receipts.find({ userId: executiveId }, { sort: { createdAt: -1 } }).fetch();
				let followUps = Collections.followUps.find({ userId: executiveId }, { sort: { createdAt: -1 } }).fetch();

				let data = tasks.concat(receipts, followUps);
				data.splice(0, skip);
				data.splice(limit, (data.length - limit));
				data.sort((a, b) => (b.createdAt - a.createdAt));

				data.forEach(item => {
					if(typeof item.type !== "undefined") {
						item.category = "task";
						if(item.type === 0) {
							item.party = Meteor.users.findOne({ _id: item.partyId }, { fields: {services: 0, availableTo: 0} });
						}
					} else if(typeof item.receiptNo !== "undefined") {
						item.category = "receipt";
						item.party = Meteor.users.findOne({ _id: item.partyId }, { fields: {services: 0, availableTo: 0} });
					} else if(typeof item.taskId !== "undefined") {
						item.category = "followUp";
						item.party = Meteor.users.findOne({ _id: item.partyId }, { fields: {services: 0, availableTo: 0} });
					}

					this.added("tasks", item._id, item);
				});

				initializing = false;
			};

			const handle1 = Collections.tasks.find({ userId: executiveId }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(!initializing) {
						this.added("tasks", _id, doc);
					}
				},

				changed: (_id, doc) => {
					this.changed("tasks", _id, doc);
				},

				removed: (_id) => {
					this.removed("tasks", _id);
				}
			});

			const handle2 = Collections.receipts.find({ userId: executiveId }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(!initializing) {
						this.added("tasks", _id, doc);
					}
				},

				changed: (_id, doc) => {
					this.changed("tasks", _id, doc);
				},

				removed: (_id) => {
					this.removed("tasks", _id);
				}
			});

			const handle3 = Collections.followUps.find({ userId: executiveId }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(!initializing) {
						this.added("tasks", _id, doc);
					}
				},

				changed: (_id, doc) => {
					this.changed("tasks", _id, doc);
				},

				removed: (_id) => {
					this.removed("tasks", _id);
				}
			});

			getHistory.apply(this);

			console.log("data publication for \"history.getExecutiveHistory is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				handle2.stop();
				handle3.stop();
				console.log("Publication, \"history.getExecutiveHistory\" is stopped.");
			});
		} else {
			this.ready();
		}
	});
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faSearch, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import { getReasonFromCode } from 'meteor/pbd-apis';

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
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const execs = Meteor.users.find({"isExecutive": true}).fetch();

					setExecutives(execs);
					setSelectedExec(execs[0]._id);
					props.onExecutiveSelection(execs[0]._id);
					setLoading(false);
				}
			})

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
		const [selectedExecId, setSelectedExecId] = useState("0");
		const [listItems, setListItems] = useState([]);
		const [selectedItemId, setSelectedItemId] = useState("0");
		const [skip, setSkip] = useState(0);
		const [loading, setLoading] = useState(true);
		const limit = 20;

		useEffect(() => {
			if(selectedExecId !== props.selectedExecutiveId) {
				setSelectedExecId(props.selectedExecutiveId);
				setSelectedItemId("0");
				setListItems([]);
			}
		}, [props.selectedExecutiveId]);

		useEffect(() => {
			const handle = Meteor.subscribe('history.getExecutiveHistory', { executiveId: props.selectedExecutiveId, skip, limit }, {
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
					const localIds = data.map((item, i) => item._id);

					Collections.tasks.find({ _id: { $in: [localIds] } }).forEach((serverItem, i) => {
						const index = localIds.indexOf(serverItem._id);

						if(index !== -1) {
							data[index] = serverItem;
						}
					});

					Collections.tasks.find({ _id: { $nin: [localIds] } }).forEach((serverItem, i) => {
						data.push(serverItem);
					});

					data.sort((a, b) => (b.createdAt - a.createdAt));
					
					setListItems(data);
					setLoading(false);

					if(selectedItemId === "0" && data.length) {
						setSelectedItemId(data[0]._id);
					}
				}
			})

			return function() {
				handle.stop();
			}
		}, [skip, selectedExecId]);

		return 	<div className="list-group history-list">
					{
						loading ?
						<div className="text-center"><FontAwesomeIcon icon={faCircleNotch} spin/> Loading...</div>
						:
						listItems && (listItems.length !== 0) ?
						(() => {
							let prevDate = moment().format("DD-MMM-YYYY");

							return listItems.map(item => {
								console.log("item: " + JSON.stringify(item));
								const date = moment(item.createdAt).format("DD-MMM-YYYY");
								let dateRow = "";
								if(prevDate !== date) {
									prevDate = date;
									dateRow = 	<div className="history-date-title">
													<div><b>{date}</b></div>
													<div>
														<button className="btn btn-info" style={{ borderRadius: 0, fontSize: "small" }}>Snapshot</button>
													</div>
												</div>
								}

								return 	<React.Fragment key={item._id}>
											{ dateRow }
											<a 	href="#" 
												className={`list-group-item custom-list-group-item list-group-item-action ${(item._id === selectedItemId) ? "active" : ""}`}
												onClick={() => {
													setSelectedItemId(item._id);
													props.onHistoryItemSelection(item._id);
												}}>
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
														<div style={{ fontSize: "large" }}>{(item.party) ? (item.party.profile.name).substring(0, 30) : (item.subject).substring(0, 30)}</div>
													</div>
													:
													(item.category === "followUp") ? 
													<div>
														<div style={{ color: "#DA2D6D" }}>Follow up</div>
														<div style={{ fontSize: "smaller" }}>{getReasonFromCode(item.followUpFor)}</div>
														<div style={{ fontSize: "large" }}>{(item.party) ? (item.party.profile.name).substring(0, 30) : (item.subject).substring(0, 30)}</div>
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
						<div>
							<div className="input-group">
								<div className="input-group-prepend">
								    <span className="input-group-text" id="basic-addon1" style={{ background: "#fff" }}>
										<FontAwesomeIcon icon={faSearch} />
								    </span>
								</div>
							  	<input type="text" className="form-control" placeholder="Search keyword" aria-label="search keyword" style={{ borderLeft: "none" }} />
							</div>
						</div>
						<div>
							<ExecutiveHistory selectedExecutiveId={selectedExecutiveId}/>
						</div>
					</div>
					<div className="col-6" style={{border: "1px solid black"}}>

					</div>
				</div>
			</div>
		</div>
	};

	export default History;
}
