import { Meteor } from 'meteor/meteor';

if(Meteor.isServer) {
	
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faEnvelope, faMobileAlt, faUserCircle, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';

	import TimingBar from './TimingBar';

	const IndividualStatus = (props) => {
		const [live, setLive] = useState(false);

		function showLive() {
			setLive(!live);
		}

		return (
			<div className="container">
				<div className="row">
					<div className="col-12 status-block" style={{paddingBottom: `${live ? "10px" : "0"}`}}>
						<div className="container" style={{paddingBottom: `${live ? "0" : "10px"}`}}>
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
											<h5>{props.name || "Unknown"}</h5>
											<div style={{lineHeight: "normal"}}>
												<FontAwesomeIcon icon={faEnvelope} size="sm"/>&nbsp;
												<span style={{"fontSize": "small"}}>
													<a href={`${props.email}`}>
														{props.email || "----------"}
													</a>
												</span>
											</div>
											<div style={{lineHeight: "normal"}}>
												<FontAwesomeIcon icon={faMobileAlt} size="sm"/>&nbsp;
												<span style={{"fontSize": "small"}}>{props.mobileNo || "----------"}</span>
											</div>
										</div>
									</div>
								</div>
								<div className="col-7" style={{padding: "0 25px"}}>
								{
									props.sessions &&
									<TimingBar data={props.sessions}/>
								}
								</div>
							</div>
						</div>
						<div className="container">
							<div className="row" style={{height: `${live ? "500px" : "0px"}`}}>
								<div className="col-8">
									<div style={{height: "0px", textAlign: "right"}}>
										<button class="btn btn-primary btn-sm" 
												style={{borderRadius: "5px 5px 0 0", marginTop: "-4em"}}
												onClick={showLive}>
											<FontAwesomeIcon icon={faMapMarkerAlt} size="sm"/> &nbsp;Live
										</button>
									</div>
									<div style={{"border": `${live ? "1px solid #888" : ""}`, height: "100%"}}>
										
									</div>
								</div>
								<div className="col-4" style={{paddingLeft: "0"}}>
									<div style={{height: "0px", textAlign: "right"}}>
										<button class="btn btn-primary btn-sm" style={{borderRadius: "5px 5px 0 0", marginTop: "-4em"}}>
											Vists: 0
										</button>
										&nbsp;&nbsp;
										<button class="btn btn-primary btn-sm" style={{borderRadius: "5px 5px 0 0", marginTop: "-4em"}}>
											Follow Ups: 0/0
										</button>
									</div>
									<div style={{"border": `${live ? "1px solid #888" : ""}`, height: "100%"}}>
										
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}
	export default IndividualStatus;
}