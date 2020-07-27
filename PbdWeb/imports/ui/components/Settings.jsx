import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { Accounts } from 'meteor/accounts-base';
import { ReactiveVar } from 'meteor/reactive-var';
import { Random } from 'meteor/random';

if(Meteor.isServer) {

	Meteor.methods({
		'settings.getAdminDetails'() {		//if editId is given, then it is a method to edit the executive's details.
			console.log("settings.getAdminDetails method");

			const adminRoleFound = Meteor.roleAssignment.findOne({ "user._id": this.userId, "role._id": "admin" });
			if(adminRoleFound) {
				console.log("settings.getAdminDetails method is completed successfully.");
				return Meteor.users.findOne({ _id: adminRoleFound.user._id }, { fields: { services: 0 } });
			}

			console.log("settings.getAdminDetails method is completed successfully.");
			return;
		},
	});
}

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
	'settings.saveAdminSettings'(inputs) {		//if editId is given, then it is a method to edit the executive's details.
		console.log("settings.saveAdminSettings method with inputs: " + JSON.stringify(inputs));

		let schemaObj = {
			phNumber: {
				type: String,
				regEx: /^[0-9]{10}$/,
				label: "Party phone number",
				optional: true,
			},

			name: { 
				type: String,
				min: 1,
				max: 1000,
				label: "Administrator Name",
			},

			currPwd: { 
				type: String,
				label: "Current Password",
			},

			newPwd: { 
				type: String,
				min: 6,
				max: 20,
				label: "New Password",
			},
		};

		const validationContext = new SimpleSchema(schemaObj, {clean: {filter: true, removeEmptyStrings: true, trimStrings: true}}).newContext();

		const cleanedInputs = validationContext.clean(inputs);
		// console.log("cleanedInputs: " + JSON.stringify(cleanedInputs));
		validationContext.validate(cleanedInputs);

		if(!validationContext.isValid()) {
			let errorObj = {};
			validationContext.validationErrors().map(field => {
				if(validationContext.keyIsInvalid(field.name)){
					errorObj[field.name] = validationContext.keyErrorMessage(field.name);
				}
			});
			const errorObjStr = JSON.stringify(errorObj);

			if(!this.isSimulation) {		//if running on the server.
				throw new Meteor.Error(400, "validation-error", errorObjStr);
				return;
			} else {
				reactiveError.set(errorObjStr);
				throw new Error("Validation failed.");
			}
		}

		if(Roles.userIsInRole(this.userId, 'webmaster', Roles.GLOBAL_GROUP)) {
			//create a new user with admin previledge
			const adminId = Accounts.createUser({
				username: cleanedInputs.phNumber,
				password: cleanedInputs.newPwd,
				profile: {
					name: cleanedInputs.name
				}
			});

			Roles.addUsersToRoles(adminId, "admin", Roles.GLOBAL_GROUP);
			return true;
		} else if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			//change the current administrator's password
			const user = Meteor.users.findOne({ _id: this.userId });
			Meteor.users.update({ _id: this.userId }, { $set: { "profile.name": cleanedInputs.name } }, { multi: false });
			const passwordValid = Accounts._checkPassword(user, cleanedInputs.currPwd);

			if(!passwordValid.error) {
				Accounts.setPassword(this.userId, cleanedInputs.newPwd, { logout: true });
			} else {
				throw new Meteor.Error(400, "validation-error", JSON.stringify({ "currPwd": "Wrong current password" }) );
			}
		}

		console.log("party.saveParty method is completed successfully.");
		return "Party saved successfully";
	},
});

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { Tracker } from 'meteor/tracker';

	const Settings = (props) => {
		const [phNumber, setPhNumber] = useState("");
		const [phNumberError, setPhNumberError] = useState("");
		const [phNumberDisabled, setPhNumberDisabled] = useState(false);

		const [name, setName] = useState("");
		const [nameError, setNameError] = useState("");

		const [currPwd, setCurrPwd] = useState("");
		const [currPwdError, setCurrPwdError] = useState("");

		const [newPwd, setNewPwd] = useState("");
		const [newPwdError, setNewPwdError] = useState("");

		const [retypePwd, setRetypePwd] = useState("");
		const [retypePwdError, setRetypePwdError] = useState("");

		function resetAllInputs() {
			setPhNumber("");
			setName("");
			setCurrPwd("");
			setNewPwd("");
			setRetypePwd("");
		}

		function removeAllErrors() {
			setPhNumberError("");
			setNameError("");
			setCurrPwdError("");
			setNewPwdError("");
			setRetypePwdError("");
		}

		function saveChanges(e) {
			e.preventDefault();

			if(newPwd !== retypePwd) {
				setRetypePwdError("Passwords do not match. Please check and try again.");
				return;
			}

			Tracker.autorun(() => {
				removeAllErrors();			//remove all the errors before setting the new messages.
				const errorObj = JSON.parse(reactiveError.get());
				// console.log("errorObj: " + JSON.stringify(errorObj));
				for(let [key, value] of Object.entries(errorObj)) {
					switch(key) {
						case "phNumber": setPhNumberError(value); break;
						case "name": setNameError(value); break;
						case "currPwd": setCurrPwdError(value); break;
						case "newPwd": setNewPwdError(value); break;
					}
				}
			});

			Meteor.apply('settings.saveAdminSettings', 
				[{ phNumber, name, currPwd, newPwd }], 
				{returnStubValues: true, throwStubExceptions: true}, 
				(err, res) => {
					// console.log("err: " + err);
					if(err){
						if(err.reason == "validation-error") {		//if validation error occurs
							reactiveError.set(err.details);
						} else if(err.error == 403) {
							if(err.reason.toLowerCase().indexOf("username") != -1) {		//if company's phone number is not unique
								setPhNumberError("This phone number already exists, Please try again.");
							}
						}
					} else {		//when success, 
						// console.log("res: " + res);
						removeAllErrors();
						resetAllInputs();
						Meteor.logout();
					}
				});
		}

		useEffect(() => {
			Meteor.apply('settings.getAdminDetails', [], {returnStubValues: true, throwStubExceptions: true}, (err, res) => {
					if(err){
						console.log("err: " + err);
					} else {		//when success, 
						console.log("res: " + res);
						if(res) {
							setPhNumber(res.username);
							setName(res.profile.name);
							setPhNumberDisabled(true);
						}
					}
				});
		}, []);

		return 	<div className="container">
					<br/>
					<br/>
					<div className="row">
						<div className="offset-3 col-6">
							<form onSubmit={saveChanges}>
								<div className="form-group row">
							    	<label htmlFor="inNumber" className="col-5 col-form-label-sm text-right">Admin Phone Number: <b className="text-danger">*</b>:</label>
							    	<div className="col-7">
							      		<input 	type="text" 
							      				className={`form-control form-control-sm ${(phNumberError === "") ? "" : "is-invalid"}`} 
							      				id="inNumber" 
							      				value={phNumber} 
							      				disabled={phNumberDisabled}
							      				onChange={e => setPhNumber(e.target.value)}/>
							      		<div className="invalid-feedback text-left">
								        	{phNumberError}
								        </div>
							    	</div>
								</div>
								<div className="form-group row">
							    	<label htmlFor="inName" className="col-5 col-form-label-sm text-right">Administrator Name: <b className="text-danger">*</b>:</label>
							    	<div className="col-7">
							      		<input 	type="text" 
							      				className={`form-control form-control-sm ${(nameError === "") ? "" : "is-invalid"}`} 
							      				id="inName" 
							      				value={name} 
							      				onChange={e => setName(e.target.value)}/>
							      		<div className="invalid-feedback text-left">
								        	{nameError}
								        </div>
							    	</div>
								</div>
								<div className="form-group row">
							    	<label htmlFor="inCurrPwd" className="col-5 col-form-label-sm text-right">Current Password: <b className="text-danger">*</b>:</label>
							    	<div className="col-7">
							      		<input 	type="password" 
							      				className={`form-control form-control-sm ${(currPwdError === "") ? "" : "is-invalid"}`} 
							      				id="inCurrPwd" 
							      				value={currPwd} 
							      				onChange={e => setCurrPwd(e.target.value)}/>
							      		<div className="invalid-feedback text-left">
								        	{currPwdError}
								        </div>
							    	</div>
								</div>
								<div className="form-group row">
							    	<label htmlFor="inNewPwd" className="col-5 col-form-label-sm text-right">New Password: <b className="text-danger">*</b>:</label>
							    	<div className="col-7">
							      		<input 	type="password" 
							      				className={`form-control form-control-sm ${(newPwdError === "") ? "" : "is-invalid"}`} 
							      				id="inNewPwd" 
							      				value={newPwd} 
							      				onChange={e => setNewPwd(e.target.value)}/>
							      		<div className="invalid-feedback text-left">
								        	{newPwdError}
								        </div>
							    	</div>
								</div>
								<div className="form-group row">
							    	<label htmlFor="inRetypeNewPwd" className="col-5 col-form-label-sm text-right">Retype New Password: <b className="text-danger">*</b>:</label>
							    	<div className="col-7">
							      		<input 	type="password" 
							      				className={`form-control form-control-sm ${(retypePwdError === "") ? "" : "is-invalid"}`} 
							      				id="inRetypeNewPwd" 
							      				value={retypePwd} 
							      				onChange={e => setRetypePwd(e.target.value)}/>
							      		<div className="invalid-feedback text-left">
								        	{retypePwdError}
								        </div>
							    	</div>
								</div>
								<div className="text-right">
									<button type="button" className="btn btn-outline-secondary" onClick={() => Router.go('/dashboard/currentstatus')}>Cancel</button> &nbsp;&nbsp;
									<button type="submit" className="btn btn-primary">Save</button>
								</div>
							</form>
						</div>
					</div>
				</div>
	};

	export default Settings;
}