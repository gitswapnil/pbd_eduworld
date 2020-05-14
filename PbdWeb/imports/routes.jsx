import { Meteor } from 'meteor/meteor';

if(Meteor.isClient) {
	import React from 'react';
	import ReactDom from 'react-dom';
	import { Router } from 'meteor/iron:router';

	import Login from './ui/components/Login';
	import Layout from './ui/components/Layout';
	import NavigationTabs from './ui/components/NavigationTabs';
	import NotFound from './ui/components/NotFound';

	const renderComponent = (component) => {
		const container = document.getElementById("react-target");
		ReactDom.unmountComponentAtNode(container);
		ReactDom.render(component, container);
	};

	const checkAuthenticationAndExecute = (func) => {
		if(!Meteor.userId()) {
			Router.go('/login');		//if the user is not logged in, then take him to the Login route.
		} else {			//if he is logged in then execute the given function
			func();
		}
	};

	const routes = () => {
		Router.route('/', () => { 
			Router.go('/login');
		});
		
		Router.route('/login', () => {
			if(Meteor.userId()) {
				Router.go('/dashboard/currentstatus');
			} else {
				renderComponent(<Login/>);
			}
		});

		Router.route('/dashboard/currentstatus', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/dashboard/currentstatus", "name": "Current Status", "selected": true}, 
					{"link": "/dashboard/reports", "name": "Reports", "selected": false}, 
					{"link": "/dashboard/history", "name": "History", "selected": false}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="dashboard">
						<NavigationTabs tabs={tabs}>
							This is Current Status Tab
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/dashboard/reports', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/dashboard/currentstatus", "name": "Current Status", "selected": false}, 
					{"link": "/dashboard/reports", "name": "Reports", "selected": true}, 
					{"link": "/dashboard/history", "name": "History", "selected": false}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="dashboard">
						<NavigationTabs tabs={tabs}>
							This is Reports Tab
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/dashboard/history', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/dashboard/currentstatus", "name": "Current Status", "selected": false}, 
					{"link": "/dashboard/reports", "name": "Reports", "selected": false}, 
					{"link": "/dashboard/history", "name": "History", "selected": true}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="dashboard">
						<NavigationTabs tabs={tabs}>
							This is History Tab
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/manageexecutives/createexecutive', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/manageexecutives/createexecutive", "name": "Create Executives", "selected": true}, 
					{"link": "/manageexecutives/notifications", "name": "Notifications", "selected": false}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="manageExecutives">
						<NavigationTabs tabs={tabs}>
							This is createexecutive Tab
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/manageexecutives/notifications', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/manageexecutives/createexecutive", "name": "Create Executives", "selected": false}, 
					{"link": "/manageexecutives/notifications", "name": "Notifications", "selected": true}
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="manageExecutives">
						<NavigationTabs tabs={tabs}>
							This is notifications Tab
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/schoolpartydata/definitions', () => {
			checkAuthenticationAndExecute(() => {
				const tabs = [
					{"link": "/schoolpartydata/definitions", "name": "Definitions", "selected": true} 
				];

				renderComponent(		//If he is logged in, then go the specified page.
					<Layout selectedSection="schoolPartyData">
						<NavigationTabs tabs={tabs}>
							This is schoolpartydata Tab
						</NavigationTabs>
					</Layout>
				);
			});
		});

		Router.route('/profile/settings', () => {
			checkAuthenticationAndExecute(() => {
				renderComponent(<div>This is Settings Page</div>);
			});
		});

		Router.route('/logout', () => {
			checkAuthenticationAndExecute(() => {
				Meteor.logout();
			});
		});

		Router.route('/:error', () => {		//Any undefined route
			renderComponent(<NotFound/>);
		});
	};

	export default routes;
} else if(Meteor.isServer) {

}
