import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import SimpleSchema from 'simpl-schema';

if(Meteor.isClient) {
	import React from 'react';
	import ReactDom from 'react-dom';

	import Login from './ui/components/Login';
	import Layout from './ui/components/Layout';
	import NavigationTabs from './ui/components/NavigationTabs';
	import NotFound from './ui/components/NotFound';

	import CreateExecutives from './ui/components/CreateExecutives';
	import PartyDefinitions from './ui/components/PartyDefinitions';

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
							<CreateExecutives/>
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
							<PartyDefinitions/>
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
	import { Accounts } from 'meteor/accounts-base';

	Router.route('/api/testroute', {where: 'server'}).get(function(req, res, next) {
		console.log("This is testroute.");
		res.end("response from testroute. It is a get method.");
	});

	/*
		params: {phNo: String, pwd: String}
		return: {error: Boolean, message: String}	if error is false then message is the apiKey for that user.
	*/
	Router.route('/api/executivelogin', {where: 'server'}).post(function(req, res, next) {
		console.log("API: executivelogin invoked.");
		const reqBody = req.body;
		console.log("phNo.: " + reqBody.phNo);
		console.log("pwd.: " + reqBody.pwd);

		//validate teh phone number and password in the beginning
		let schemaObj = {
			phNo: { 
				type: String,
				regEx: SimpleSchema.RegEx.Phone,
				label: "Phone Number"
			},
			pwd: { 
				type: String,
				label: "Password",
			}
		};

		const validationContext = new SimpleSchema(schemaObj, {clean: {filter: true, removeEmptyStrings: true, trimStrings: true}}).newContext();

		const cleanedInputs = validationContext.clean(reqBody);
		// console.log("cleanedInputs: " + JSON.stringify(cleanedInputs));
		validationContext.validate(cleanedInputs);

		if(validationContext.keyIsInvalid("phNo")) {		//the phone number should be properly given
			res.end(JSON.stringify({error: true, message: validationContext.keyErrorMessage("phNo")}));
			return;
		}

		if(validationContext.keyIsInvalid("pwd")) {			//the password should be properly given
			res.end(JSON.stringify({error: true, message: validationContext.keyErrorMessage("pwd")}));
			return;
		}

		let user = Accounts.findUserByUsername(reqBody.phNo);
		if(!user) {				//if the user exists
			res.end(JSON.stringify({error: true, message: "Invalid phone number. Please check again."}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app."}));
			return;
		}

		const passwordValid = Accounts._checkPassword(user, reqBody.pwd);
		if(passwordValid.error) {		//if the password is invalid
			res.end(JSON.stringify({error: true, message: "Incorrect Password."}));
			return;
		}

		if(!user.apiKey) {
			res.end(JSON.stringify({error: true, message: "User does not have an apiKey."}));
			return;
		}
		
		res.end(JSON.stringify({error: false, message: user.apiKey}));
		return;
	});

	Router.route('/api/getappdata', {where: 'server'}).post(function(req, res, next){
		console.log("API: getappdata invoked.");
		const reqBody = req.body;
		console.log("apiKey: " + reqBody.apiKey);

		res.end(JSON.stringify({error: false, message: "This is the response from getappdata api."}));
		return;
	})
}
