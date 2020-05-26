import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import Collections from 'meteor/collections';
import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';

if(Meteor.isServer) {
	Meteor.publish('party.getAll', function(){
		console.log("Publishing the party.getAll...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {

			// console.log("userId: " +JSON.stringify(userIds));
			const handle = Meteor.users.find({}, {fields: {services: 0}}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(fields));
					const userRole = Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "party"});
					if(userRole) {		//if user is executive only then show it in the list.
						doc.isParty = true;
						this.added('users', _id, doc);
					}
				},

				changed: (_id, doc) => {
					doc.isParty = true;
					this.changed('users', _id, doc);
				},

				removed: (_id) => {
					this.removed('users', _id);
				}
			});

			console.log("data publication for \"party.getAll is complete.\"");
			this.ready();
			this.onStop(() => {
				handle.stop();
				console.log("Publication, \"party.getAll\" is stopped.");
			});
		}
	});
}

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
	'party.saveParty'(inputs, editId) {		//if editId is given, then it is a method to edit the executive's details.
		console.log("party.saveParty method with inputs: " + JSON.stringify(inputs) + " and editId: " + (editId || "undefined"));

		let schemaObj = {
			partyCode: { 
				type: String, 
				min: 1,
				max: 10,
				label: "Party Code"
			},
			partyName: { 
				type: String,
				min: 1,
				max: 1000,
				label: "Party Name",
			},
			partyPhoneNo: { 
				type: String,
				regEx: SimpleSchema.RegEx.Phone,
				label: "Party phone number",
			},
			partyEmail: { 
				type: String,
				regEx: SimpleSchema.RegEx.Email,
				label: "Party email",
				optional: true,
			},
			partyAddress: { 
				type: String,
				min: 1,
				max: 1000,
				label: "Party Address",
			}
		};

		// if(editId && editId !== "") {		//if edit Id is defined and not an empty string, then its an edit method
		// 	delete schemaObj.cPhNo;
		// 	schemaObj.pwd.optional = true;		//make password optional
		// }

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

		if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {		//authorization
			if(editId || editId !== "") {		//if edit method
				if(!Meteor.users.findOne({"_id": editId})){			//check if the edit Id is genuine or not.
					throw new Meteor.Error(400, "validation-error", "{\"generalError\":\"Attempt to change invalid User\"}");
					return;
				};

				console.log("Saving the changes for party with _id: " + editId + "...");
				Accounts.setUsername(editId, cleanedInputs.partyCode);		//change the party code.
				let modifier = {
					"profile.name": cleanedInputs.partyName,
					"profile.phoneNumber": cleanedInputs.partyPhoneNo,
					"profile.address": cleanedInputs.partyAddress
				};
				Meteor.users.update({"_id": editId}, {$set: modifier}, {multi: false, upsert: false});
				if(cleanedInputs.partyEmail) {		//if email is given then only change the email.
					Accounts.addEmail(editId, cleanedInputs.partyEmail);
				}
				console.log("new changes have been saved for the given party with the id: " + editId);
			} else {
				console.log("Creating a new Party...");
				let insertData = {
					username: cleanedInputs.partyCode,
					email: cleanedInputs.partyEmail,
					password: Random.hexString(6),		//set a random password for this party
					profile: {
						name: cleanedInputs.partyName,
						phoneNumber: cleanedInputs.partyPhoneNo,
						address: cleanedInputs.partyAddress,
					}
				};

				if(!insertData.email) {			//if email is not given, then remove it while inserting as new user
					delete insertData.email;
				}

				const newUserId = Accounts.createUser(insertData);
				console.log(`A party with code: ${cleanedInputs.partyCode} is created.`);
				console.log("Now adding user the previlege of an party...");
				Roles.addUsersToRoles(newUserId, "party", Roles.GLOBAL_GROUP);
				console.log("The user has been assigned the party Role.");
			}
		}

		console.log("party.saveParty method is completed successfully.");
		return "Party saved successfully";
	},
});

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faSchool, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import Table from './Table.jsx';
	import Modal from './Modal.jsx';

	const PartyDefinitions = (props) => {
		const [partyCode, setPartyCode] = useState("");
		const [partyCodeError, setPartyCodeError] = useState("");

		const [partyName, setPartyName] = useState("");
		const [partyNameError, setPartyNameError] = useState("");

		const [partyPhoneNo, setPartyPhoneNo] = useState("");
		const [partyPhoneNoError, setPartyPhoneNoError] = useState("");

		const [partyEmail, setPartyEmail] = useState("");
		const [partyEmailError, setPartyEmailError] = useState("");

		const [partyAddress, setPartyAddress] = useState("");
		const [partyAddressError, setPartyAddressError] = useState("");

		const [showModal, setShowModal] = useState(false);
		const [parties, setParties] = useState([]);
		const [generalError, setGeneralError] = useState("");
		const [editId, setEditId] = useState("");

		function resetAllInputs() {
			setPartyCode("");
			setPartyName("");
			setPartyPhoneNo("");
			setPartyEmail("");
			setPartyAddress("");
		}

		function removeAllErrors() {
			setPartyCodeError("");
			setPartyNameError("");
			setPartyPhoneNoError("");
			setPartyEmailError("");
			setPartyAddressError("");
			setGeneralError("");
		}

		function clearModal() {
			setShowModal(false);
			removeAllErrors();
			resetAllInputs();
			setEditId("");
		}

		function fillModal(editId) {
			const party = Meteor.users.findOne({"_id": editId});
			setPartyCode(party.username);
			setPartyName((party.profile && party.profile.name) || "");
			setPartyPhoneNo((party.profile && party.profile.phoneNumber) || "");
			setPartyEmail((party.emails && party.emails[0] && party.emails[0].address) || "");
			setPartyAddress(party.profile && party.profile.address);

			setEditId(editId);
			setShowModal(true);
		}

		function savePartyInfo() {
			Tracker.autorun(() => {
				removeAllErrors();			//remove all the errors before setting the new messages.
				const errorObj = JSON.parse(reactiveError.get());
				// console.log("errorObj: " + JSON.stringify(errorObj));
				for(let [key, value] of Object.entries(errorObj)) {
					switch(key) {
						case "partyCode": setPartyCodeError(value); break;
						case "partyName": setPartyNameError(value); break;
						case "partyPhoneNo": setPartyPhoneNoError(value); break;
						case "partyEmail": setPartyEmailError(value); break;
						case "partyAddress": setPartyAddressError(value); break;
						case "generalError": setGeneralError(value); break;
					}
				}
			});

			Meteor.apply('party.saveParty', 
				[{ partyCode, partyName, partyPhoneNo, partyEmail, partyAddress }, editId], 
				{returnStubValues: true, throwStubExceptions: true}, 
				(err, res) => {
					// console.log("err: " + err);
					if(err){
						if(err.reason == "validation-error") {		//if validation error occurs
							// console.log("err.details: " + err.details);
							reactiveError.set(err.details);
						} else if(err.error == 403) {
							const errText = err.reason.toLowerCase();
							if(errText.indexOf("username") != -1) {		//if company's phone number is not unique
								setPartyCodeError("Party code exists. Party code should be unique. Please check and try again.");
							} else if(errText.indexOf("email") != -1) {	//if executive's email is not unique
								setPartyEmailError("This Email exists in the database for other user. Please check and try again.");
							}
						}
					} else {		//when success, 
						// console.log("res: " + res);
						clearModal();
					}
				});
		}

		//subscribe for the list here.
		useEffect(() => {
			const handle = Meteor.subscribe('party.getAll', {
				onStop(error) {
					console.log("party.getAll is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("party.getAll is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					let arr = Meteor.users.find({"isParty": true}).map((doc, index) => {
						return {
							cells: [
								{ style: {"textAlign": "right"}, content: (index + 1)}, 
								{ content: doc.username}, 
								{ key: ((doc.profile && doc.profile.name) + (doc.profile && doc.profile.address)), content: <div>{doc.profile && doc.profile.name}<br/>{doc.profile && doc.profile.address}</div>},
								{ content: (doc.profile && doc.profile.phoneNumber)},
								{ content: moment(doc.createdAt).format("Do MMM YYYY h:mm:ss a")}
							],
							rowAttributes: {
								key: doc._id,
								className: "row-selectable",
								onClick: fillModal.bind(this, doc._id)
							}
						}
					});
					setParties(arr);	
				}
			})

			return function() {
				handle.stop();
			}
		}, []);		//empty array means it will run only at mounting and unmounting.

		return (
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12 text-right">
					{/*----------- Modal Data goes here --------------*/}
						<button type="button" className="btn btn-primary" style={{"boxShadow": "1px 2px 3px #999"}} onClick={() => setShowModal(true)}>
							<FontAwesomeIcon icon={faSchool} size="sm"/>&nbsp;&nbsp;Add Party&nbsp;&nbsp;
						</button>
						<Modal show={showModal} onHide={clearModal} onSave={savePartyInfo}>
							<Modal.Title>
								{
									(editId === "") ? 
									<div>
										<FontAwesomeIcon icon={faSchool} size="lg"/> Create New Party
									</div>
									:
									<div>
										<FontAwesomeIcon icon={faPencilAlt} size="lg"/> Edit Party Details
									</div>
								}
							</Modal.Title>

							<Modal.Body>
								<form>
									<div className="row">
										<div className="col-12">
											<div className="form-group row">
										    	<label htmlFor="inPartyCode" className="col-4 col-form-label-sm text-right">Party Code<b className="text-danger">*</b>:</label>
									      		<div className="col-3">
										      		<input 	type="text" 
										      				className={`form-control form-control-sm ${(partyCodeError === "") ? "" : "is-invalid"}`} 
										      				id="inPartyCode" 
										      				value={partyCode} 
										      				onChange={e => setPartyCode(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{partyCodeError}
											        </div>
									      		</div>
											</div>
											<div className="form-group row">
										    	<label htmlFor="inPartyName" className="col-4 col-form-label-sm text-right">Party Name<b className="text-danger">*</b>:</label>
										    	<div className="col-7">
										      		<input 	type="text" 
										      				className={`form-control form-control-sm ${(partyNameError === "") ? "" : "is-invalid"}`} 
										      				id="inPartyName" 
										      				value={partyName} 
										      				onChange={e => setPartyName(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{partyNameError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
										    	<label htmlFor="inPartyPhoneNo" className="col-4 col-form-label-sm text-right">Party's Phone No.<b className="text-danger">*</b>:</label>
										    	<div className="col-4">
										      		<input 	type="text" 
										      				className={`form-control form-control-sm ${(partyPhoneNoError === "") ? "" : "is-invalid"}`} 
										      				id="inPartyPhoneNo" 
										      				value={partyPhoneNo} 
										      				onChange={e => setPartyPhoneNo(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{partyPhoneNoError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
										    	<label htmlFor="inPartyEmail" className="col-4 col-form-label-sm text-right">Party's Email(if any):</label>
										    	<div className="col-4">
										      		<input 	type="text" 
										      				className={`form-control form-control-sm ${(partyEmailError === "") ? "" : "is-invalid"}`} 
										      				id="inPartyEmail" 
										      				value={partyEmail} 
										      				onChange={e => setPartyEmail(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{partyEmailError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
										    	<label htmlFor="inPartyAddress" className="col-4 col-form-label-sm text-right">Address<b className="text-danger">*</b>:</label>
										    	<div className="col-7">
										      		<textarea 	type="text" 
										      					className={`form-control form-control-sm ${(partyAddressError === "") ? "" : "is-invalid"}`} 
										      					id="inPartyAddress" 
										      					value={partyAddress} 
										      					onChange={e => setPartyAddress(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{partyAddressError}
											        </div>
										    	</div>
											</div>
										</div>
									</div>
								</form>
								<small className="form-text text-danger text-center">
									{generalError}
								</small>
							</Modal.Body>
						</Modal>
					</div>
				</div>
				<br/>
				<div className="row">
					<div className="col-12">
						<Table>
							<Table.Header dataArray={[
								{ "content": "SI. No." },
								{ "content": "Party Code" },
								{ "content": "Party Name & Address"}, 
								{ "content": "Phone Number"},
								{ "content": "Updated on"}
							]}/>
							<Table.Body dataArray={parties}/>
						</Table>
					</div>
				</div>
			</div>
		);
	}

	export default PartyDefinitions;

}