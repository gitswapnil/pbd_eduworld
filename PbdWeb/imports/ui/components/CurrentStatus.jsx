import { Meteor } from 'meteor/meteor'
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	
}

// Meteor.methods({

// });

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import IndividualStatus from './IndividualStatus';

	const CurrentStatus = (props) => {
		return (
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12">
						<IndividualStatus />
					</div>
				</div>
			</div>
		)
	}
	export default CurrentStatus;
}
