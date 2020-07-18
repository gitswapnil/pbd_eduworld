import { Meteor } from 'meteor/meteor';

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
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faSearch, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';

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
						<div>Loading...</div>
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
						<div>No Executives Present</div>
					}
				</div>
	};

	const ExecutiveHistory = (props) => {
		const [] = useState();

		useEffect(() => {
			const handle = Meteor.subscribe('history.getExecutiveHistory', {
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
					const execs = Meteor.users.find({"isExecutive": true}).fetch();
				}
			})

			return function() {
				handle.stop();
			}
		}, []);

		return 	<div className="list-group history-list">
					<a href="#" className="list-group-item list-group-item-action active">Cras justo odio</a>
					<a href="#" className="list-group-item list-group-item-action">Dapibus ac facilisis in</a>
					<a href="#" className="list-group-item list-group-item-action">Dapibus ac facilisis in</a>
					<a href="#" className="list-group-item list-group-item-action">Dapibus ac facilisis in</a>
					<a href="#" className="list-group-item list-group-item-action">Dapibus ac facilisis in</a>
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
					<div className="col-2" style={{ paddingLeft: "5px", paddingRight: "0px", maxHeight: "100%", fontSize: "smaller", overflowY: "auto" }}>
						<ExecutivesList onExecutiveSelection={onExecutiveSelection.bind(this)}/>
					</div>
					<div className="col-4" style={{ padding: 0, maxHeight: "100%" }}>
						<div style={{ padding: "7px", borderBottom: "1px solid #ddd" }}>
							<div className="input-group">
								<div className="input-group-prepend">
								    <span className="input-group-text" id="basic-addon1" style={{ background: "#fff" }}>
										<FontAwesomeIcon icon={faSearch} />
								    </span>
								</div>
							  	<input type="text" className="form-control" placeholder="Search keyword" aria-label="search keyword" style={{ borderLeft: "none" }} />
							</div>
						</div>
						<div style={{ maxHeight: "88%", overflowY: "auto" }}>
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
