import { Meteor } from 'meteor/meteor';

if(Meteor.isServer) {
	
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faEnvelope, faMobileAlt, faUserCircle } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';

	import TimingBar from './TimingBar';

	const IndividualStatus = (props) => {
		return (
			<div className="container">
				<div className="row">
					<div className="col-12 status-block">
						<div className="row">
							<div className="col-6" style={{"borderRight": "1px solid #888"}}>
								<div className="row">
									<div className="col-3 text-center">
										{
											(props.img) ? 
											<img className="img-thumbnail" src={props.img} height="80px" width="auto"/>
											:
											<FontAwesomeIcon icon={faUserCircle} size="5x"/>
										}
									</div>
									<div className="col-9">
										<h5>{props.name || "Unknown"}</h5>
										<div>
											<FontAwesomeIcon icon={faEnvelope} size="sm"/>&nbsp;
											<span style={{"fontSize": "small"}}>
												<a href={`${props.email}`}>
													{props.email || "----------"}
												</a>
											</span>
										</div>
										<div>
											<FontAwesomeIcon icon={faMobileAlt} size="sm"/>&nbsp;
											<span style={{"fontSize": "small"}}>{props.mobileNo || "----------"}</span>
										</div>
									</div>
								</div>
							</div>
							<div className="col-6" style={{padding: "0 25px"}}>
								<TimingBar data={
									{
										"123": {
											"start": moment("11-06-20 8:45", "DD-MM-YY HH:mm").toDate(),
											"end": moment("11-06-20 11:18", "DD-MM-YY HH:mm").toDate()
										},
										"545": {
											"start": moment("11-06-20 12:30", "DD-MM-YY HH:mm").toDate(),
											"end": moment("11-06-20 14:37", "DD-MM-YY HH:mm").toDate()
										},
										"546": {
											"start": moment("11-06-20 15:30", "DD-MM-YY HH:mm").toDate(),
											"end": moment("11-06-20 20:37", "DD-MM-YY HH:mm").toDate()
										}
									}
								}/>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}
	export default IndividualStatus;
}