import { Meteor } from 'meteor/meteor';

if(Meteor.isServer) {
	
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import PropTypes from 'prop-types';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faEnvelope, faMobileAlt, faUserCircle, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';

	import TimingBar from './TimingBar';
	import ExecutiveMap from './ExecutiveMap';

	const IndividualStatus = (props) => {
		const [showDetails, setShowDetails] = useState(false);
		const [showLive, setShowLive] = useState(false);

		return (
			<div className="container">
				<div className="row">
					<div className="col-12 status-block" style={{paddingBottom: `${showDetails ? "10px" : "0"}`}}>
						<div className="container" style={{paddingBottom: `${showDetails ? "0" : "10px"}`}}>
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
							<div className="row" style={{height: `${showDetails ? "500px" : "0px"}`}}>
								<div className="col-8">
									<div style={{height: "0px", textAlign: "right"}}>
										<button className="btn btn-primary btn-sm" 
												style={{borderRadius: "5px 5px 0 0", marginTop: "-4em"}}
												onClick={() => {setShowDetails(!showDetails), setShowLive(!showLive)}}
												disabled={(props.sessions === null)}>
											<FontAwesomeIcon icon={faMapMarkerAlt} size="sm"/> &nbsp;Live
										</button>
									</div>
									<div style={{"border": `${showDetails ? "1px solid #888" : ""}`, height: "100%"}}>
										{
											showLive ? 
											(() => {
												const lastLocation = props.sessions[props.sessions.length - 1];
												console.log("lastLocation: " + JSON.stringify(lastLocation));
												return <ExecutiveMap latitude={lastLocation.latitude} longitude={lastLocation.longitude} executiveName={props.name} zoom={15}/>
											})()
											: null
										}
									</div>
								</div>
								<div className="col-4" style={{paddingLeft: "0"}}>
									<div style={{height: "0px", textAlign: "right"}}>
										<button className="btn btn-primary btn-sm" 
												style={{borderRadius: "5px 5px 0 0", marginTop: "-4em", fontSize: "small"}}
												onClick={() => {setShowDetails(!showDetails)}}
												disabled={(props.sessions === null)}>
											Vists: 0
										</button>
										&nbsp;&nbsp;
										<button className="btn btn-primary btn-sm" 
												style={{borderRadius: "5px 5px 0 0", marginTop: "-4em", fontSize: "small"}}
												onClick={() => {setShowDetails(!showDetails)}}
												>
											Follow Ups: 0/0
										</button>
									</div>
									<div style={{"border": `${showDetails ? "1px solid #888" : ""}`, height: "100%"}}>
										
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
		sessions: PropTypes.array
	};

	IndividualStatus.defaultProps = {
		img: null,
		name: 'Unknown',
		email: "----------",
		mobileNo: "----------",
		sessions: null
	};

	export default IndividualStatus;
}