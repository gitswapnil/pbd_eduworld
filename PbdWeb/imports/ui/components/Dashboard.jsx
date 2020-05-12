import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';

const Dashboard = (props) => {
	
	return <h3> This is Dashboard Component with {props.selectedTab} selected </h3>
};

export default Dashboard;