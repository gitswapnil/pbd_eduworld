import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import Collections from 'meteor/collections';
import { Accounts } from 'meteor/accounts-base';

if(Meteor.isServer) {
	Meteor.publish('executives.getAll', function(){
		console.log("Publishing the executives.getAll...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {

			// console.log("userId: " +JSON.stringify(userIds));
			const handle = Meteor.users.find({}, {fields: {services: 0}}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(fields));
					const userRole = Meteor.roleAssignment.findOne({"user._id": _id, "role._id": "executive"});
					if(userRole) {		//if user is executive only then show it in the list.
						doc.isExecutive = true;
						this.added('users', _id, doc);
					}
				},

				changed: (_id, doc) => {
					doc.isExecutive = true;
					this.changed('users', _id, doc);
				},

				removed: (_id) => {
					this.removed('users', _id);
				}
			});

			console.log("data publication for \"executives.getAll is complete.\"");
			this.ready();
			this.onStop(() => {
				handle.stop();
				console.log("Publication, \"executives.getAll\" is stopped.");
			});
		}
	});
}

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
	'executives.saveExecutive'(inputs, editId) {		//if editId is given, then it is a method to edit the executive's details.
		console.log("executive.saveExecutive method with inputs: " + JSON.stringify(inputs) + " and editId: " + (editId || "undefined"));

		let schemaObj = {
			userImg: { 
				type: String, 
				optional: true,
				label: "User Image"
			},
			cPhNo: { 
				type: String,
				regEx: SimpleSchema.RegEx.Phone,
				label: "Company's phone number"
			},
			name: { 
				type: String,
				min: 1,
				max: 100,
				label: "Name",
			},
			pPhNo: { 
				type: String,
				regEx: SimpleSchema.RegEx.Phone,
				label: "Personal phone number",
			},
			email: { 
				type: String,
				regEx: SimpleSchema.RegEx.Email,
			},
			resAddress: { 
				type: String,
				min: 1,
				max: 1000,
				label: "Residential address",
			},
			pwd: { 
				type: String,
				min: 4,
				max: 10,
				label: "Password",
			}
		};

		if(editId && editId !== "") {		//if edit Id is defined and not an empty string, then its an edit method
			delete schemaObj.cPhNo;
			schemaObj.pwd.optional = true;		//make password optional
		}

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

				console.log("Saving the changes for executive with _id: " + editId + "...");
				let modifier = {
					"profile.name": cleanedInputs.name,
					"profile.img": cleanedInputs.userImg,
					"profile.phoneNumber": cleanedInputs.pPhNo,
					"profile.address": cleanedInputs.resAddress
				};
				Meteor.users.update({"_id": editId}, {$set: modifier}, {multi: false, upsert: false});
				Accounts.addEmail(editId, cleanedInputs.email);
				if(cleanedInputs.pwd) {		//if password is given then only set the password.
					Accounts.setPassword(editId, cleanedInputs.pwd);
				}
				console.log("new changes have been saved for the given executive with the id: " + editId);
			} else {
				console.log("Creating a new executive...");
				const newUserId = Accounts.createUser({
					username: cleanedInputs.cPhNo,
					email: cleanedInputs.email,
					password: cleanedInputs.pwd,
					profile: {
						name: cleanedInputs.name,
						img: cleanedInputs.userImg,
						phoneNumber: cleanedInputs.pPhNo,
						address: cleanedInputs.resAddress,
					}
				});
				console.log(`An executive with username: ${cleanedInputs.cPhNo} is created.`);
				console.log("Now adding user the previlege of an executive...");
				Roles.addUsersToRoles(newUserId, "executive", Roles.GLOBAL_GROUP);
				console.log("The user has been assigned the executive Role.");
			}
		}

		console.log("executive.saveExecutive method is completed successfully.");
		return "Executive saved successfully";
	},
});

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faUserPlus, faUserEdit, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import Table from './Table.jsx';
	import Modal from './Modal.jsx';
 
	const CreateExecutives = (props) => {
		const [showModal, setShowModal] = useState(false);

		const [userImg, setUserImg] = useState("");
		const [userImgError, setUserImgError] = useState("");

		const [cPhNo, setCPhNo] = useState("");
		const [cPhNoError, setCPhNoError] = useState("");

		const [name, setName] = useState("");
		const [nameError, setNameError] = useState("");

		const [pPhNo, setPPhNo] = useState("");
		const [pPhNoError, setPPhNoError] = useState("");

		const [email, setEmail] = useState("");
		const [emailError, setEmailError] = useState("");

		const [resAddress, setResAddress] = useState("");
		const [resAddressError, setResAddressError] = useState("");

		const [pwd, setPwd] = useState("");
		const [pwdError, setPwdError] = useState("");

		const [generalError, setGeneralError] = useState("");

		const [executives, setExecutives] = useState([]);

		const [editId, setEditId] = useState("");

		const modalRef = React.createRef();			//this is to attach modal when needed to close the modal

		function resetAllInputs() {
			setUserImg("");
			setCPhNo("");
			setName("");
			setPPhNo("");
			setEmail("");
			setResAddress("");
			setPwd("");
		}

		function removeAllErrors() {
			setUserImgError("");
			setCPhNoError("");
			setNameError("");
			setPPhNoError("");
			setEmailError("");
			setResAddressError("");
			setPwdError("");
			setGeneralError("");
		}

		function clearModal() {
			setShowModal(false);
			removeAllErrors();
			resetAllInputs();
			setEditId("");
		}

		function fillModal(editId) {
			const executive = Meteor.users.findOne({"_id": editId});
			setCPhNo(executive.username);
			setUserImg(executive.profile.img || "");
			setName(executive.profile.name || "");
			setPPhNo(executive.profile.phoneNumber || "");
			setEmail((executive.emails && executive.emails[0] && executive.emails[0].address) || "");
			setResAddress(executive.profile.address);

			setEditId(editId);
			setShowModal(true);
		}

		function saveExecutiveInfo() {
			Tracker.autorun(() => {
				removeAllErrors();			//remove all the errors before setting the new messages.
				const errorObj = JSON.parse(reactiveError.get());
				// console.log("errorObj: " + JSON.stringify(errorObj));
				for(let [key, value] of Object.entries(errorObj)) {
					switch(key) {
						case "userImg": setUserImgError(value); break;
						case "cPhNo": setCPhNoError(value); break;
						case "name": setNameError(value); break;
						case "pPhNo": setPPhNoError(value); break;
						case "email": setEmailError(value); break;
						case "resAddress": setResAddressError(value); break;
						case "pwd": setPwdError(value); break;
						case "generalError": setGeneralError(value); break;
					}
				}
			});

			Meteor.apply('executives.saveExecutive', 
				[{ userImg, cPhNo, name, pPhNo, email, resAddress, pwd }, editId], 
				{returnStubValues: true, throwStubExceptions: true}, 
				(err, res) => {
					// console.log("err: " + err);
					if(err){
						if(err.reason == "validation-error") {		//if validation error occurs
							// console.log("err.details: " + err.details);
							reactiveError.set(err.details);
						} else if(err.error == 403) {
							if(err.reason.toLowerCase().indexOf("username") != -1) {		//if company's phone number is not unique
								setCPhNoError("Company's phone number exists. Please check and try again.");
							} else if(err.reason.toLowerCase().indexOf("email") != -1) {	//if executive's email is not unique
								setEmailError("This Email exists in the database for other user. Please check and try again.");
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
			const handle = Meteor.subscribe('executives.getAll', {
				onStop(error) {
					console.log("executives.getAll is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("executives.getAll is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					let arr = Meteor.users.find({"isExecutive": true}).map((doc, index) => {
						return {
							cells: [
								{ style: {"textAlign": "right"}, content: (index + 1)}, 
								{ content: doc.profile.name}, 
								{ content: doc.username}, 
								{ content: moment(doc.createdAt).format("Do MMM YYYY h:mm:ss a")}
							],
							rowAttributes: {
								key: doc._id,
								className: "row-selectable",
								onClick: fillModal.bind(this, doc._id)
							}
						}
					});
					setExecutives(arr);	
				}
			})

			return function() {
				handle.stop();
			}
		}, []);		//empty array means it will run only at mounting and unmounting.

		return(
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12 text-right">
					{/*----------- Modal Data goes here --------------*/}
						<button type="button" className="btn btn-primary" style={{"boxShadow": "1px 2px 3px #999"}} onClick={() => setShowModal(true)}>
							<FontAwesomeIcon icon={faUserPlus} size="sm"/>&nbsp;&nbsp;Create New Executive&nbsp;&nbsp;
						</button>

						<Modal show={showModal} onHide={clearModal} onSave={saveExecutiveInfo}>
							<Modal.Title>
								{
									(editId === "") ? 
									<div>
										<FontAwesomeIcon icon={faUserPlus} size="lg"/> Create New Executive
									</div>
									:
									<div>
										<FontAwesomeIcon icon={faUserEdit} size="lg"/> Edit Executive
									</div>
								}
							</Modal.Title>

							<Modal.Body>
								<form>
									<div className="row">
										<div className="col-8">
											<div className="form-group row">
										    	<label htmlFor="inPhNumber" className="col-5 col-form-label-sm text-right">Company's Phone Number<b className="text-danger">*</b>:</label>
							      				{
										      		(editId === "") ?
										      		<div className="col-7">
											      		<input 	type="text" 
											      				className={`form-control form-control-sm ${(cPhNoError === "") ? "" : "is-invalid"}`} 
											      				id="inPhNumber" 
											      				aria-describedby="companysPhNoHelperBlock"
											      				value={cPhNo} 
											      				onChange={e => setCPhNo(e.target.value)}/>
											      		<small id="companysPhNoHelperBlock" className="form-text text-info text-left">
															This cannot be changed after save
														</small>
											      		<div className="invalid-feedback text-left">
												        	{cPhNoError}
												        </div>
										      		</div>
								      				: 
								      				<div className="col-7">
											      		<input 	type="text" 
											      				className="form-control form-control-sm" 
											      				id="inPhNumber" 
											      				aria-describedby="companysPhNoHelperBlock"
											      				value={cPhNo}
											      				disabled />
											      	</div>
							      				}
											</div>
											<div className="form-group row">
										    	<label htmlFor="inName" className="col-5 col-form-label-sm text-right">Name<b className="text-danger">*</b>:</label>
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
										    	<label htmlFor="inPersonalPhNo" className="col-5 col-form-label-sm text-right">Personal Phone Number<b className="text-danger">*</b>:</label>
										    	<div className="col-7">
										      		<input 	type="text" 
										      				className={`form-control form-control-sm ${(pPhNoError === "") ? "" : "is-invalid"}`} 
										      				id="inPersonalPhNo" 
										      				value={pPhNo} 
										      				onChange={e => setPPhNo(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{pPhNoError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
										    	<label htmlFor="inEmail" className="col-5 col-form-label-sm text-right">Email Address<b className="text-danger">*</b>:</label>
										    	<div className="col-7">
										      		<input 	type="email" 
										      				className={`form-control form-control-sm ${(emailError === "") ? "" : "is-invalid"}`} 
										      				id="inEmail" 
										      				value={email} 
										      				onChange={e => setEmail(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{emailError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
										    	<label htmlFor="txtAreaResAddress" className="col-5 col-form-label-sm text-right">Residential Address<b className="text-danger">*</b>:</label>
										    	<div className="col-7">
										      		<textarea 	type="text" 
										      					className={`form-control form-control-sm ${(resAddressError === "") ? "" : "is-invalid"}`} 
											      				id="txtAreaResAddress" 
											      				value={resAddress} 
											      				onChange={e => setResAddress(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{resAddressError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
												{
													(editId === "") ?
											    	<label htmlFor="pwd" className="col-5 col-form-label-sm text-right">Password for this executive<b className="text-danger">*</b>:</label>
											    	:
											    	<label htmlFor="pwd" className="col-5 col-form-label-sm text-right">Password for this executive:</label>
												}
										    	<div className="col-7">
										      		<input 	type="password" 
										      				className={`form-control form-control-sm ${(pwdError === "") ? "" : "is-invalid"}`} 
										      				id="pwd" 
										      				value={pwd} 
										      				onChange={e => setPwd(e.target.value)}/>
								      				<small id="companysPhNoHelperBlock" className="form-text text-info text-left">
														The executive will use this password while signing-in in the Mobile app
													</small>
											    	<div className="invalid-feedback text-left">
											        	{pwdError}
											        </div>
										    	</div>
											</div>
										</div>
										<div className="col-4">
											<div className="text-center">
												{
													userImg != "" ? 
													<img src={userImg} className="img-thumbnail"/> : 
													<div style={{"border": "1px solid #ccc", "borderRadius": "3px", "padding": "20px"}}>
														<FontAwesomeIcon icon={faUserEdit} size="7x" style={{"color": "#aaa"}}/>
													</div>
												}
												<small className="text-danger">
										        	{userImgError == "" ? "" : userImgError} 
										        </small>
											</div>
											<div className="text-right">
												<input 	type="file" 
														className="custom-file-input" 
														id="inFileUserImg" 
														hidden={true} 
														accept="image/*" 
														onChange={(event) => {
															const file = event.target.files[0];
															const reader = new FileReader();

															reader.readAsDataURL(file);
															reader.onload = () => {
																// console.log(reader.result);
																setUserImg(reader.result);
															}

															reader.onerror = () => {
																// console.log(reader.error);
																setUserImgError(reader.error);
															}
														}}/>
												<button type="button" className="btn btn-light btn-sm" onClick={() => { $('#inFileUserImg').click() }}>
													<FontAwesomeIcon icon={faPencilAlt} size="sm"/>&nbsp;Edit
												</button>
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
								{ "content": "Name" },
								{ "content": "Company Phone No."}, 
								{ "content": "Updated on"}
							]}/>
							<Table.Body dataArray={executives}/>
						</Table>
					</div>
				</div>
			</div>
		);
	};

	export default CreateExecutives;
}