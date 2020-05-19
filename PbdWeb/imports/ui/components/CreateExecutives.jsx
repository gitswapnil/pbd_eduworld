import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import Collections from 'meteor/collections';
import { Accounts } from 'meteor/accounts-base';
// import moment from 

if(Meteor.isServer) {
	Meteor.publish('executives.getAll', function(){
		console.log("Publishing the executives.getAll.");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			let initializing = true;

			// userIds = Meteor.roleAssignment.find({"role._id": "executive"}, {fields: {"user._id": 1}}).map(doc => doc.user._id);
			// console.log("userId: " +JSON.stringify(userIds));
			// const handle = Meteor.users.find({"_id": {"$in": userIds}, "username": {$ne: "9686059262"}}, {fields: {services: 0}}).observeChanges({
			const handle = Meteor.users.find({"username": {$ne: "9686059262"}}, {fields: {services: 0}}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(fields));
					// if(!initializing) {
						doc.isExecutive = true;
						this.added('users', _id, doc);
					// }
				},

				changed: (_id, doc) => {
					doc.isExecutive = true;
					this.changed('users', _id, doc);
				},

				removed: (_id) => {
					this.removed('users', _id);
				}
			});

			// Meteor.users.find({}, {fields: {services: 0}}).map(user => {
			// 	console.log("userObj: " + JSON.stringify(user));
			// 	const _id = user._id;
			// 	delete user._id;
			// 	// this.added('users', _id, user);
			// });


			initializing = false;

			this.ready();
			this.onStop(() => {
				handle.stop();
				console.log("Publication, \"executives.getAll\" is being stopped.");
			});
		}
	});
}

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
	'executives.create'(inputs) {
		console.log("executive.create method with args: ", inputs);

		const validationContext = new SimpleSchema({
			userImg: { 
				type: String, 
				optional: true,
				label: "User Image"
			},
			cPhNo: { 
				type: String,
				regEx: SimpleSchema.RegEx.Phone,
				label: "Company's Phone number"
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
				label: "Personal Phone number",
			},
			email: { 
				type: String,
				regEx: SimpleSchema.RegEx.Email,
			},
			resAddress: { 
				type: String,
				min: 1,
				max: 1000,
				label: "Residential Address",
			},
			pwd: { 
				type: String,
				min: 4,
				max: 10,
				label: "Password",
			}
		}, {
			clean: {
				filter: true,
				removeEmptyStrings: true,
				trimStrings: true,
			},
		}).newContext();

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

			if(!this.isSimulation) {
				throw new Meteor.Error(400, "validation-error", errorObjStr);
				return;
			} else {
				reactiveError.set(errorObjStr);
				throw new Error("Validation failed.");
			}
		}

		if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			console.log("Creating a new executive...");
			const newUserId = Accounts.createUser({
				username: cleanedInputs.cPhNo,
				email: cleanedInputs.email,
				password: cleanedInputs.pwd,
				profile: {
					name: cleanedInputs.name,
					img: cleanedInputs.userImg,
					phoneNumber: cleanedInputs.pPhNo,
					resAddress: cleanedInputs.resAddress,
				}
			});
			console.log(`An executive with username: ${cleanedInputs.cPhNo} is created.`);
			console.log("Now adding user the previlege of an executive...");
			Roles.addUsersToRoles(newUserId, "executive", Roles.GLOBAL_GROUP);
			console.log("The user has been assigned the executive Role.");
			console.log("executive.create method is completed successfully.");
		}

		return "Executive created successfully";
	}
});

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faUserPlus, faUserEdit, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import Table from './Table.jsx';
	import Modal from './Modal.jsx';
 
	const CreateExecutives = () => {
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

		const [executives, setExecutives] = useState([]);

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
		}

		function clearModal() {
			removeAllErrors();
			resetAllInputs();
		}

		function createNewExecutive() {
			Tracker.autorun(() => {
				removeAllErrors();			//remove all the errors before setting the new messages.
				const errorObj = JSON.parse(reactiveError.get());
				for(let [key, value] of Object.entries(errorObj)) {
					switch(key) {
						case "userImg": setUserImgError(value); break;
						case "cPhNo": setCPhNoError(value); break;
						case "name": setNameError(value); break;
						case "pPhNo": setPPhNoError(value); break;
						case "email": setEmailError(value); break;
						case "resAddress": setResAddressError(value); break;
						case "pwd": setPwdError(value); break;
					}
				}
			});

			Meteor.apply('executives.create', 
				[{ userImg, cPhNo, name, pPhNo, email, resAddress, pwd }], 
				{returnStubValues: true, throwStubExceptions: true}, 
				(err, res) => {
					// console.log("err: " + err);
					if(err){
						if(err.reason == "validation-error") {		//if validation error occurs
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
						// $(modalRef.current).modal('hide');		//hide the modal.
						$('#mdlDialog').modal('hide');
					}
				});

		}

		//subscribe for the list here.
		useEffect(() => {
			const handle = Meteor.subscribe('executives.getAll', "testArgs", {
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
					let arr = Meteor.users.find({"isExecutive": true}).map((doc, index) => [
						{ style: {"textAlign": "right"}, data: (index + 1)}, 
						{ data: doc.profile.name}, 
						{ data: doc.profile.phoneNumber}, 
						{ data: moment(doc.createdAt).format("Do MMM YYYY h:mm:ss a")}
					]);
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
						<Modal forwardRef={modalRef} onHide={clearModal} onSave={createNewExecutive}>
							<Modal.Button color="primary">
								<FontAwesomeIcon icon={faUserPlus} size="sm"/>&nbsp;&nbsp;Create New Executive&nbsp;&nbsp;
							</Modal.Button>

							<Modal.Title>
								<FontAwesomeIcon icon={faUserPlus} size="lg"/> Create New Executive
							</Modal.Title>

							<Modal.Body>
								<form>
									<div className="row">
										<div className="col-8">
											<div className="form-group row">
										    	<label htmlFor="inPhNumber" className="col-5 col-form-label-sm text-right">Company's Phone Number:</label>
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
											</div>
											<div className="form-group row">
										    	<label htmlFor="inName" className="col-5 col-form-label-sm text-right">Name:</label>
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
										    	<label htmlFor="inPersonalPhNo" className="col-5 col-form-label-sm text-right">Personal Phone Number:</label>
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
										    	<label htmlFor="inEmail" className="col-5 col-form-label-sm text-right">Email Address:</label>
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
										    	<label htmlFor="txtAreaResAddress" className="col-5 col-form-label-sm text-right">Residential Address:</label>
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
										    	<label htmlFor="pwd" className="col-5 col-form-label-sm text-right">Password for this executive:</label>
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
							</Modal.Body>
						</Modal>
					</div>
				</div>
				<br/>
				<div className="row">
					<div className="col-12">
						<Table>
							<Table.Header dataArray={[
								{ "data": "SI. No." },
								{ "data": "Name" },
								{ "data": "Phone No."}, 
								{ "data": "Updated on"}
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