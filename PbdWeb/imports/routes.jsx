import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import SimpleSchema from 'simpl-schema';
import Collections from 'meteor/collections';

if(Meteor.isClient) {
	import React from 'react';
	import ReactDom from 'react-dom';

	import Login from './ui/components/Login';
	import Layout from './ui/components/Layout';
	import NavigationTabs from './ui/components/NavigationTabs';
	import NotFound from './ui/components/NotFound';

	import CurrentStatus from './ui/components/CurrentStatus';
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
							<CurrentStatus/>
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
		params: {phNo: String, pwd: String, apiKey: String}
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
			},
		};

		const validationContext = new SimpleSchema(schemaObj, {clean: {filter: true, removeEmptyStrings: true, trimStrings: true}}).newContext();

		const cleanedInputs = validationContext.clean(reqBody);
		// console.log("cleanedInputs: " + JSON.stringify(cleanedInputs));
		validationContext.validate(cleanedInputs);

		if(validationContext.keyIsInvalid("phNo")) {		//the phone number should be properly given
			res.end(JSON.stringify({error: true, message: validationContext.keyErrorMessage("phNo"), code: 400}));
			return;
		}

		if(validationContext.keyIsInvalid("pwd")) {			//the password should be properly given
			res.end(JSON.stringify({error: true, message: validationContext.keyErrorMessage("pwd"), code: 400}));
			return;
		}

		let user = Accounts.findUserByUsername(reqBody.phNo);
		if(!user || !user.active) {				//if the user does not exists or if it is not active
			res.end(JSON.stringify({error: true, message: "Invalid phone number. Please check again.", code: 400}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
			return;
		}

		const passwordValid = Accounts._checkPassword(user, reqBody.pwd);
		if(passwordValid.error) {		//if the password is invalid
			res.end(JSON.stringify({error: true, message: "Incorrect Password.", code: 400}));
			return;
		}

		if(!user.apiKey) {
			res.end(JSON.stringify({error: true, message: "User does not have an apiKey.", code: 400}));
			return;
		}
		
		res.end(JSON.stringify({error: false, message: user.apiKey, code: 200}));
		return;
	});

	/*
		params: {
			apiKey: String, 
			locations: [
				{
					id: Int,
					latitude: Double,
					longitude: Double,
					sessionId: Int,
					createdAt: timeStamp(Long Int)
				}, ...
			],
			userDetails: {
				updatedAt: timestamp(Long Int),
			},
			notifications: {
				updatedAt: timestamp(Long Int)
			}
		}
		return: {
			error: Boolean, 
			message: "{
				locationIds: [Int, Int, ...]			//these are the ids which are saved in the database
				userDetails: {
					name: String,
					phoneNo: String,
					email: String,
					img: String,
					updatedAt: String
				}
			}",
			code: Integer
		}	if error is false then message is the apiKey for that user.
	*/
	Router.route('/api/syncdata', {where: 'server'}).post(function(req, res, next){
		console.log("API: syncdata invoked.");
		const reqBody = req.body;

		//if request body is not defined, then return error
		if(!reqBody) {
			res.end(JSON.stringify({error: true, message: "reqBody must have atleast an apiKey. requset body is null.", code: 400}));
			return;
		}

		console.log("syncdata reqBody: " + JSON.stringify(reqBody));
		//first check for the APIkey;
		console.log("apiKey: " + reqBody.apiKey);
		if(!reqBody.apiKey || (typeof reqBody.apiKey !== "string") || reqBody.apiKey.length !== 32) {
			res.end(JSON.stringify({error: true, message: "Invalid API key. Please check and try again.", code: 400}));
			return;
		}

		const user = Meteor.users.findOne({"apiKey": reqBody.apiKey});
		if(!user) {
			res.end(JSON.stringify({error: true, message: "Unkonwn API key.", code: 401}));
			return;
		}

		if(!Roles.userIsInRole(user._id, "executive", Roles.GLOBAL_GROUP)){		//if the user does not have administrative rights.
			res.end(JSON.stringify({error: true, message: "User does not have the rights to access mobile app.", code: 400}));
			return;
		}

		let returnObj = {};

		//if the locations key is defined.
		if(reqBody.locations) {
			let locations = reqBody.locations;

			// console.log("locations: " + JSON.stringify(locations));
			if(!Array.isArray(locations)) {		//validate the locations array
				res.end(JSON.stringify({error: true, message: "Error in the given locations Array.", code: 400}));
				return;
			}

			let retIds = [];

			locations.map((location, index) => {
				let obj = {
					latitude: location.latitude,
					longitude: location.longitude,
					sessionId: location.sessionId,
					userId: user._id,
					createdAt: location.createdAt
				}

				Collections.locations.insert(obj);
				retIds.push(location.id);
			});

			returnObj.locationIds = retIds;
		}

		if(reqBody.userDetails && reqBody.userDetails.updatedAt) {
			const updatedAt = reqBody.userDetails.updatedAt;

			const dbUserUpdatedAt = moment(user.updatedAt).unix() * 1000;		//convert the timeStamps to milliseconds

			if(updatedAt < dbUserUpdatedAt) {		//if app's updatedAt is less than web's then only send app the updated values
				returnObj.userDetails = {
					name: user.profile.name || "Unassigned",
					phoneNo: user.username,
					email: (user.emails && user.emails[user.emails.length - 1] && user.emails[user.emails.length - 1].address) || "Unknown",
					img: (user.profile.img && user.profile.img.split(",")[1]),
					address: user.profile.address || "Unknown",
					updatedAt: dbUserUpdatedAt
				}
			}
		}

		console.log(`returnObj: ${JSON.stringify(returnObj)}`);

		res.end(JSON.stringify({ error: false, message: returnObj, code: 200 }));
	})
}
