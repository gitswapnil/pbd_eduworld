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

		return 	data && data.map(visit => 	<div key={visit._id} className="status-visits-list-item">
												<div className="status-visits-list-item-reason">{(visit && (typeof visit.reason == "number")) ? getReasonFromCode(visit.reason) : ""}</div>
												<div className="status-visits-list-item-time">{(visit && visit.createdAt) ? moment(visit.createdAt).format("HH:mm") : ""}</div>
												<div style={{clear: "both"}}></div>
												<div className="status-visits-list-item-partyName">{(visit && visit.partyName) ? visit.partyName : ""}</div>
												<div className="status-visits-list-item-partyAddress">{(visit && visit.partyAddress) ? visit.partyAddress : ""}</div>
												<div className="status-visits-list-item-contactPerson">{(visit && visit.cpName && visit.cpNumber) ? `${visit.cpNumber}(${visit.cpName})` : ""}</div>
												<div className="status-visits-list-item-remarks">{(visit && visit.remarks) ? visit.remarks : ""}</div>
											</div>);
	}

	const FollowUpsList = (props) => {
		console.log("followUps: " + JSON.stringify(props.followUps));
		return <div>This is Follow Ups Tab</div>
	}

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
												}}
												disabled={(props.sessions === null)}>
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
										{/*
											showLive ? 
											(() => {
												const lastLocation = props.sessions[props.sessions.length - 1];
												console.log("lastLocation: " + JSON.stringify(lastLocation));
												return <ExecutiveMap latitude={lastLocation.latitude} longitude={lastLocation.longitude} executiveName={props.name} zoom={15}/>
											})()
											: null
										*/}
									</div>
								</div>
								<div className="col-4" style={{paddingLeft: "0"}}>
									<div style={{textAlign: "right"}}>
										<button className={`btn btn-primary btn-sm ${selectedTab == 1 ? "btn-inactive" : ""}`} 
												style={{borderRadius: "5px 5px 0 0", fontSize: "small", visibility: showLiveDetails ? "visible" : "hidden"}}
												onClick={() => {setSelectedTab(0)}}
												disabled={(props.sessions === null)}>
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
													props.visits ? props.visits.forEach(visit => {
														if(typeof visit.followUpFor === "undefined") {
															++finished;
														} else {
															++toComplete;
														}
													}) : null

													return `${toComplete}/${finished}`;
												})()
											}
										</button>
									</div>
									<div style={{border: "1px solid #888", height: "470px", visibility: showLiveDetails ? "visible" : "hidden", overflowY: "auto"}}>
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