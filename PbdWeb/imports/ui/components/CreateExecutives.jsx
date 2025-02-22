import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import Collections from 'meteor/collections';
import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';

if(Meteor.isServer) {
	Meteor.publish('executives.getAll', function({ skip, limit }){
		console.log("Publishing the executives.getAll... got inputs as, skip: " + skip + ", limit: " + limit);
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("userId: " +JSON.stringify(userIds));
			const totalPages = Math.ceil(Meteor.roleAssignment.find({"role._id": "executive"}).count() / limit);
			this.added("temp", "execsInfo", { totalPages });

			let publishedIds = {};
			let initializing = true;
			const handle1 = Meteor.roleAssignment.find({"role._id": "executive"}).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(doc));
					if(doc.user && doc.user._id) {
						if(!initializing) {
							const userDoc = Meteor.users.findOne({"_id": doc.user._id}, {fields: {"services": 0}});
							userDoc.isExecutive = true;
							this.added('users', userDoc._id, userDoc);
						}
						publishedIds[doc.user._id] = true;
					}
				}
			});

			const handle2 = Meteor.users.find().observeChanges({
				changed: (_id, doc) => {
					if(_id && publishedIds[_id]) {
						let tempDoc = Meteor.users.findOne({ _id }, {fields: {services: 0, apiKey: 0}});
						tempDoc.isExecutive = true;

						this.changed('users', _id, tempDoc);
					}
				},
			});

			Meteor.users.find({ _id: { $in: Object.keys(publishedIds) } }, {fields: {"services": 0}, sort: { updatedAt: -1 }, skip, limit}).forEach(doc => {
				doc.isExecutive = true;
				this.added('users', doc._id, doc);
			});

			initializing = false;

			console.log("data publication for \"executives.getAll is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				handle2.stop();
				console.log("Publication, \"executives.getAll\" is stopped.");
			});
		} else {
			this.ready();
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
			receiptSeries: { 
				type: String,
				min: 1,
				max: 100,
				label: "Receipt Series",
			},
			pwd: { 
				type: String,
				min: 4,
				max: 10,
				label: "Password",
			},
			active: {
				type: Boolean,
				label: "Keep this executive active",
				defaultValue: true,
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
					"profile.address": cleanedInputs.resAddress,
					"profile.receiptSeries": cleanedInputs.receiptSeries,
					"active": cleanedInputs.active,
					"updatedAt": new Date()
				};
				// console.log("modifier: " + JSON.stringify(modifier));
				//first remove the image so that if it is not passed from the UI then it will not be retained
				if(!cleanedInputs.userImg) {
					Meteor.users.update({"_id": editId}, {$unset: {"profile.img": ""}}, {multi: false, upsert: false});
				}

				if(cleanedInputs.pwd) {		//if password is given then only set the password.
					Accounts.setPassword(editId, cleanedInputs.pwd);
					modifier.apiKey = Random.hexString(32);
				}
				
				Meteor.users.update({"_id": editId}, {$set: modifier}, {multi: false, upsert: false});
				Accounts.removeEmail(editId, cleanedInputs.email);	//replace the email so that it will last in the list.
				Accounts.addEmail(editId, cleanedInputs.email);
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
						receiptSeries: cleanedInputs.receiptSeries,
					},
					apiKey: Random.hexString(32),
					active: cleanedInputs.active,
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
	import { faUserPlus, faUserEdit, faPencilAlt, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
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

		const [receiptSeries, setReceiptSeries] = useState("");
		const [receiptSeriesError, setReceiptSeriesError] = useState("");

		const [pwd, setPwd] = useState("");
		const [pwdError, setPwdError] = useState("");

		const [keepUserActive, setKeepUserActive] = useState(true);
		const [keepUserActiveError, setKeepUserActiveError] = useState("");

		const [generalError, setGeneralError] = useState("");

		const [executives, setExecutives] = useState(null);
		const [selectedPage, setSelectedPage] = useState(1);
		const [totalPages, setTotalPages] = useState(1);

		const [editId, setEditId] = useState("");

		const modalRef = React.createRef();			//this is to attach modal when needed to close the modal
		const viewLimit = 10;

		function resetAllInputs() {
			setUserImg("");
			setCPhNo("");
			setName("");
			setPPhNo("");
			setEmail("");
			setResAddress("");
			setReceiptSeries("");
			setPwd("");
			setKeepUserActive(true);
		}

		function removeAllErrors() {
			setUserImgError("");
			setCPhNoError("");
			setNameError("");
			setPPhNoError("");
			setEmailError("");
			setResAddressError("");
			setReceiptSeriesError("");
			setPwdError("");
			setGeneralError("");
			setKeepUserActiveError("");
		}

		function removeUserImg() {
			setUserImg("");
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
			setUserImg((executive.profile && executive.profile.img) || "");
			setName((executive.profile && executive.profile.name) || "");
			setPPhNo((executive.profile && executive.profile.phoneNumber) || "");
			setEmail((executive.emails && executive.emails[executive.emails.length - 1] && executive.emails[executive.emails.length - 1].address) || "");
			setResAddress(executive.profile && executive.profile.address);
			setReceiptSeries(executive.profile && executive.profile.receiptSeries);
			setKeepUserActive(executive.active);

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
						case "receiptSeries": setReceiptSeriesError(value); break;
						case "pwd": setPwdError(value); break;
						case "active": setKeepUserActiveError(value); break;
						case "generalError": setGeneralError(value); break;
					}
				}
			});

			Meteor.apply('executives.saveExecutive', 
				[{ userImg, cPhNo, name, pPhNo, email, resAddress, receiptSeries, pwd, active: keepUserActive }, editId], 
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
						setSelectedPage(1);
						clearModal();
					}
				});
		}

		function onPageSelected(pageNo) {
			// console.log("pageNo: " + pageNo);
			setSelectedPage(pageNo);
		}

		//subscribe for the list here.
		useEffect(() => {
			const skip = (selectedPage - 1) * viewLimit;
			const handle = Meteor.subscribe('executives.getAll', { skip, limit: viewLimit }, {
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
					let arr = Meteor.users.find({"isExecutive": true}, { sort: { updatedAt: -1 } }).map((doc, index) => {
						return {
							cells: [
								{ style: {"textAlign": "right", "color": !doc.active ? "#AAA" : null}, content: skip + (index + 1)}, 
								{ style: {"color": !doc.active ? "#AAA" : null}, content: (doc.profile && doc.profile.name)}, 
								{ style: {"color": !doc.active ? "#AAA" : null}, content: doc.username}, 
								{ style: {"color": !doc.active ? "#AAA" : null}, content: moment(doc.updatedAt).format("Do MMM YYYY h:mm:ss a")},
							],
							rowAttributes: {
								key: doc._id,
								className: "row-selectable",
								onClick: fillModal.bind(this, doc._id)
							}
						}
					});

					const totalPages = Collections.temp.findOne({ _id: "execsInfo" }).totalPages;

					setTotalPages(totalPages);
					setExecutives(arr);	
				}
			})

			return function() {
				handle.stop();
			}
		}, [selectedPage]);		//empty array means it will run only at mounting and unmounting.

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
										    	<label htmlFor="inReceiptSeries" className="col-5 col-form-label-sm text-right">Receipt Series<b className="text-danger">*</b>:</label>
										    	<div className="col-7">
										      		<input 	type="text" 
										      				className={`form-control form-control-sm ${(receiptSeriesError === "") ? "" : "is-invalid"}`} 
										      				id="inReceiptSeries" 
										      				value={receiptSeries} 
										      				onChange={e => setReceiptSeries(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{receiptSeriesError}
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
											<div className="form-group row">
												<label htmlFor="userActive" className="col-5 col-form-label-sm text-right">Keep this executive active:</label>
										    	<div className="col-7">
										    		<div className="form-check text-left">
											    		<input 	className="form-check-input" 
											    				type="checkbox" 
											    				checked={keepUserActive}
											    				onChange={(e => { setKeepUserActive(!keepUserActive) }).bind(this)} 
											    				id="userActive"/>
											    	</div>
											    	<br/>
								      				<small id="companysPhNoHelperBlock" className="form-text text-info text-left">
														When inactive, this user will not be able to access the app.
													</small>
											    	<div className="invalid-feedback text-left">
											        	{keepUserActiveError}
											        </div>
										    	</div>
											</div>
										</div>
										<div className="col-4">
											<div className="text-center">
												{
													(userImg == "") ? 
													<div style={{"border": "1px solid #ccc", "borderRadius": "3px", "padding": "20px"}}>
														<FontAwesomeIcon icon={faUserEdit} size="7x" style={{"color": "#aaa"}}/>
													</div>
													: 
													<img src={userImg} className="img-thumbnail"/> 
												}
												<small className="text-danger">
										        	{(userImgError == "") ? "" : userImgError} 
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
												{
													(userImg == "") ?
													<button type="button" className="btn btn-light btn-sm" onClick={() => { $('#inFileUserImg').click() }}>
														<FontAwesomeIcon icon={faPencilAlt} size="sm"/>&nbsp;Edit
													</button>
													:
													<button type="button" className="btn btn-light btn-sm" onClick={removeUserImg}>
														<FontAwesomeIcon icon={faTrashAlt} size="sm"/>&nbsp;Remove
													</button> 
												}
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
						<Table selectedPage={selectedPage} totalPages={totalPages} onPageSelect={(pageNo => onPageSelected(pageNo)).bind(this)}>
							<Table.Header dataArray={[
								{ "content": "SI. No." },
								{ "content": "Name" },
								{ "content": "Company Phone No." }, 
								{ "content": "Updated on" },
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