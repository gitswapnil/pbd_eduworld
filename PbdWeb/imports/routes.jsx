import { Meteor } from 'meteor/meteor';

if(Meteor.isClient) {
	import React from 'react';
	import ReactDom from 'react-dom';
	import { Router } from 'meteor/iron:router';

	import Login from './ui/components/Login';
	import Dashboard from './ui/components/Dashboard';
	import NotFound from './ui/components/NotFound';

	const renderComponent = (component) => {
		const container = document.getElementById("react-target");
		ReactDom.unmountComponentAtNode(container);
		ReactDom.render(component, container);
	};

	const routes = () => {
		Router.route('/', () => { 
			Router.go('/login');
		});
		
		Router.route('/login', () => {
			if(!Meteor.userId()) {
				renderComponent(<Login/>);		//if the user is not logged in, then take him to the Login route.
			} else {
				Router.go('/dashboard/currentstatus');			//If he is logged in, then take him to the Dashboard/currentstatus page By default
			}
		});

		Router.route('/dashboard/:tab', () => {
			if(!Meteor.userId()) {			//if the user is not logged in, take him to the Login route.
				Router.go('/login');
			} else {
				renderComponent(<Dashboard selectedTab="currentstatus"/>);		//If he is logged in, then go the specified page.
			}
		});

		Router.route('/:error', () => {		//Any undefined route
			renderComponent(<NotFound/>);
		});
	};

	export default routes;
} else if(Meteor.isServer) {

}
