import { Meteor } from 'meteor/meteor';

if(Meteor.isServer) {
	
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import PropTypes from 'prop-types';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faEnvelope, faMobileAlt, faUserCircle, faAngleDown,faAngleUp } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';

	import TimingBar from './TimingBar';
	import ExecutiveMap from './ExecutiveMap';
	import { getReasonFromCode } from 'meteor/pbd-apis';

	const VisitedList = (props) => {
		const data = props.visits;

		if(data) {
			if(data.length) {
				return 	data && data.map(visit => 	<div key={visit._id} className="status-visits-list-item">
														<div className="status-visits-list-item-reason">{(visit && (typeof visit.reason == "number")) ? getReasonFromCode(visit.reason) : ""}</div>
														<div className="status-visits-list-item-time">{(visit && visit.createdAt) ? moment(visit.createdAt).format("HH:mm") : ""}</div>
														<div style={{clear: "both"}}></div>
														<div className="status-visits-list-item-partyName">{(visit && visit.partyName) ? visit.partyName : ""}</div>
														<div className="status-visits-list-item-partyAddress">{(visit && visit.partyAddress) ? visit.partyAddress : ""}</div>
														<div className="status-visits-list-item-contactPerson">{(visit && visit.cpName && visit.cpNumber) ? `${visit.cpNumber}(${visit.cpName})` : ""}</div>
														<div className="status-visits-list-item-remarks">{(visit && visit.remarks) ? visit.remarks : ""}</div>
													</div>);
			} else {
				return <div style={{textAlign: "center", fontSize: "small"}}>No Data Present</div>;
			}
		}

		return <div></div>;
	};

	const FollowUpsList = (props) => {
		const data = props.followUps;

		console.log("followUps: " + JSON.stringify(props.followUps));
		
		const getListItems = (items, type) => {
			return items && items.map(item => 
				<div key={item._id} className={`status-followUps-list-item-${type}`}>
					<div className="status-followUps-list-item-followUpFor">{(item && (typeof item.followUpFor == "number")) ? getReasonFromCode(item.followUpFor) : ""}</div>
					<div className="status-followUps-list-item-partyName">{(item && item.partyName) ? item.partyName : ""}</div>
					<div className="status-followUps-list-item-partyAddress">{(item && item.partyAddress) ? item.partyAddress : ""}</div>
					<div className="status-followUps-list-item-contactPerson">{(item && item.cpName && item.cpNumber) ? `${item.cpNumber}(${item.cpName})` : ""}</div>
				</div>);
		};

		let completedFollowUps = [];
		let toCompleteFollowUps = [];

		if(data) {
			if(data.length) {
				data.map(followUp => {
					if(followUp.completed) {
						completedFollowUps.push(followUp);
					} else {
						toCompleteFollowUps.push(followUp);
					}
				});

				let toComplete = <div></div>;
				if (toCompleteFollowUps.length !== 0) {
					toComplete = <div className="status-followUps-toComplete">
									<div className="header">Not Completed</div>
									{getListItems(toCompleteFollowUps, "toComplete")}
								</div>
				}

				let completed = <div></div>;
				if(completedFollowUps.length !== 0) {
					completed = <div className="status-followUps-completed">
									<div className="header">Completed</div>
									{getListItems(completedFollowUps, "completed")}
								</div>
				}

				return <div>{toComplete}{completed}</div>;
			} else {
				return <div style={{textAlign: "center", fontSize: "small"}}>No Data Present</div>
			}
		}

		return <div></div>;

	};

	const IndividualStatus = (props) => {
		const [showLiveDetails, setShowLiveDetails] = useState(false);
		const [showLive, setShowLive] = useState(false);
		const [selectedTab, setSelectedTab] = useState(0);

		return (
			<div className="container">
				<div className="row">
					<div className="col-12 status-block" style={{paddingBottom: `${showLiveDetails ? "10px" : "0"}`}}>
						<div className="container" style={{paddingBottom: `${showLiveDetails ? "0" : "10px"}`}}>
							<div className="row">
								<div className="col-5">
									<div className="row">
										<div className="col-3 text-center">
											{
												(props.img) ? 
												<img className="img-thumbnail" src={props.img}/>
												:
												<FontAwesomeIcon icon={faUserCircle} size="5x"/>
											}
										</div>
										<div className="col-9">
											<h5>{props.name}</h5>
											<div style={{lineHeight: "normal"}}>
												<FontAwesomeIcon icon={faEnvelope} size="sm"/>&nbsp;
												<span style={{"fontSize": "small"}}>
													<a href={`${props.email}`}>
														{props.email}
													</a>
												</span>
											</div>
											<div style={{lineHeight: "normal"}}>
												<FontAwesomeIcon icon={faMobileAlt} size="sm"/>&nbsp;
												<span style={{"fontSize": "small"}}>{props.mobileNo}</span>
											</div>
										</div>
									</div>
								</div>
								<div className="col-7" style={{padding: "0 25px"}}>
								{
									(props.sessions) ?
									<TimingBar data={props.sessions}/>
									:
									<h4 className="text-muted" style={{textAlign:"center"}}>OFF Duty</h4>
								}
								</div>
							</div>
						</div>
						<div className="container">
							<div className="row" style={{height: `${showLiveDetails ? "500px" : "0px"}`}}>
								<div className="col-8">
									<div style={{height: "0px", textAlign: "right"}}>
										<button className="btn btn-primary btn-sm" 
												style={{borderRadius: "5px 5px 0 0", marginTop: "-4em"}}
												onClick={() => {
													setShowLiveDetails(!showLiveDetails);
													setShowLive(true);
												}}>
											{showLiveDetails ? 
												<React.Fragment>
													Hide Details &nbsp;<FontAwesomeIcon icon={faAngleUp} size="sm"/>
												</React.Fragment> :
												<React.Fragment>
													See Live Details &nbsp;<FontAwesomeIcon icon={faAngleDown} size="sm"/>
												</React.Fragment>
											}
										</button>
									</div>
									<div style={{border: "1px solid #888", height: "100%", visibility: showLiveDetails ? "visible" : "hidden"}}>
										{
											showLive ? 
											(() => {
												if(!props.sessions) {
													return <div style={{textAlign: "center", fontSize: "small"}}>Not Live</div>;
												} 
												
												const lastLocation = props.sessions[props.sessions.length - 1];
												console.log("lastLocation: " + JSON.stringify(lastLocation));

												if(moment().diff(moment(lastLocation.end), 'minutes') > 3) {
													return <div style={{textAlign: "center", fontSize: "small"}}>Not Live</div>;
												}

												return <ExecutiveMap latitude={lastLocation.latitude} longitude={lastLocation.longitude} executiveName={props.name} zoom={15}/>
											})()
											: null
										}
									</div>
								</div>
								<div className="col-4" style={{paddingLeft: "0"}}>
									<div style={{textAlign: "right"}}>
										<button className={`btn btn-primary btn-sm ${selectedTab == 1 ? "btn-inactive" : ""}`} 
												style={{borderRadius: "5px 5px 0 0", fontSize: "small", visibility: showLiveDetails ? "visible" : "hidden"}}
												onClick={() => {setSelectedTab(0)}}>
											Vists: {props.visits ? props.visits.length : 0}
										</button>
										&nbsp;&nbsp;
										<button className={`btn btn-primary btn-sm ${selectedTab == 0 ? "btn-inactive" : ""}`} 
												style={{borderRadius: "5px 5px 0 0", fontSize: "small", visibility: showLiveDetails ? "visible" : "hidden"}}
												onClick={() => {setSelectedTab(1)}}
												>
											Follow Ups: {
												(() => {
													let finished = 0, toComplete = 0;
													props.followUps ? props.followUps.forEach(followUp => {
														if(followUp.completed) {
															++finished;
														}
														++toComplete;
													}) : null

													return `${finished}/${toComplete}`;
												})()
											}
										</button>
									</div>
									<div style={{border: "1px solid #888", height: showLiveDetails ? "470px" : "0px", visibility: showLiveDetails ? "visible" : "hidden", overflowY: "auto"}}>
										{
											selectedTab == 0 ? 
											<VisitedList visits={props.visits}/>
											:
											<FollowUpsList followUps={props.followUps}/>
										}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	IndividualStatus.propTypes = {
		img: PropTypes.string,
		name: PropTypes.string,
		email: PropTypes.string,
		mobileNo: PropTypes.string,
		sessions: PropTypes.array,
		visits: PropTypes.array,
		followUps: PropTypes.array,
	};

	IndividualStatus.defaultProps = {
		img: null,
		name: 'Unknown',
		email: "----------",
		mobileNo: "----------",
		sessions: null,
		visits: null,
		followUps: null,
	};

	export default IndividualStatus;
}