import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { ReactiveVar } from 'meteor/reactive-var';

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
	'executives.create'(inputs) {
		console.log("creating a new executive");
		console.log("args: ", inputs);

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
		}).newContext();

		validationContext.validate(inputs);

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
			} else {
				reactiveError.set(errorObjStr);
				throw new Error("Validation failed.");
			}
		}

		if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.warn("Came inside the admin previlege");

		}

	}
});

if(Meteor.isClient) {
	import React, { useState } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faUserPlus, faUserEdit, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
 
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

		function removeAllErrors() {
			setUserImgError("");
			setCPhNoError("");
			setNameError("");
			setPPhNoError("");
			setEmailError("");
			setResAddressError("");
			setPwdError("");
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
					if(err && err.reason == "validation-error") {
						reactiveError.set(err.details);
					} else {
						console.log("res: " + res);
					}
				});

		}

		return(
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12 text-right">
						<button type="button" className="btn btn-primary" data-toggle="modal" data-target="#mdlCreateExecutive" style={{"boxShadow": "1px 2px 3px #999"}}>
							<FontAwesomeIcon icon={faUserPlus} size="sm"/>&nbsp;Create New Executive&nbsp;&nbsp;
						</button>
					{/*----------- Modal Data goes here --------------*/}
						<div className="modal fade" id="mdlCreateExecutive" tabIndex="-1" role="dialog" aria-labelledby="createNewExecutive" aria-hidden="true">
							<div className="modal-dialog modal-lg" role="document">
								<div className="modal-content">
									<div className="modal-header">
										<h5 className="modal-title" id="createNewExecutive">
											<FontAwesomeIcon icon={faUserPlus} size="lg"/> Create New Executive
										</h5>
										<button type="button" className="close" data-dismiss="modal" aria-label="Close">
											<span aria-hidden="true">&times;</span>
										</button>
									</div>
									<div className="modal-body">
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
												      				onChange={e => setCPhNo(e.target.value)}
												      				required/>
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
												      				onChange={e => setName(e.target.value)}
												      				required/>
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
												      				onChange={e => setPPhNo(e.target.value)}
												      				required/>
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
												      				onChange={e => setEmail(e.target.value)}
												      				required/>
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
													      				onChange={e => setResAddress(e.target.value)}
													      				required/>
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
												      				onChange={e => setPwd(e.target.value)}
												      				required/>
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
																required 
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
									</div>
									<div className="modal-footer">
										<button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
										<button type="button" className="btn btn-primary" onClick={createNewExecutive}>Save changes</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<br/>
				<div className="row">
					<div className="col-12">
						<table className="tbl">
							<thead>
								<tr>
									<th className="text-right">Sl. No.</th>
									<th>Name</th>
									<th>Phone No.</th>
									<th>Updated on</th>
								</tr>
							</thead>
							<tbody>
								<tr className="row-selectable">
									<td className="text-right">1</td>
									<td>Swapnil Bandiwadekar</td>
									<td>9686059262</td>
									<td>12-May-2020</td>
								</tr>
								<tr>
									<td className="text-right">2</td>
									<td>Jacob</td>
									<td>tdornton</td>
									<td>@fat</td>
								</tr>
								<tr>
									<td className="text-right">3</td>
									<td colSpan="2">Larry tde Bird</td>
									<td>@twitter</td>
								</tr>
								<tr>
									<td className="text-right">3</td>
									<td colSpan="2">Larry tde Bird</td>
									<td>@twitter</td>
								</tr>
								<tr>
									<td className="text-right">3</td>
									<td colSpan="2">Larry tde Bird</td>
									<td>@twitter</td>
								</tr>
								<tr>
									<td className="text-right">3</td>
									<td colSpan="2">Larry tde Bird</td>
									<td>@twitter</td>
								</tr>
								<tr>
									<td className="text-right">3</td>
									<td colSpan="2">Larry tde Bird</td>
									<td>@twitter</td>
								</tr>
								<tr>
									<td className="text-right">3</td>
									<td colSpan="2">Larry the Bird</td>
									<td>@twitter</td>
								</tr>
								
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	};

	export default CreateExecutives;
}