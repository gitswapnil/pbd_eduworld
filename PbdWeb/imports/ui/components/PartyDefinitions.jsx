import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';

if(Meteor.isServer) {

}



if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faSchool, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
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
		const [generalError, setGeneralError] = useState("");
		const [editId, setEditId] = useState("");

		function resetAllInputs() {
			setPartyCodeError("");
			setPartyNameError("");
			setPartyPhoneNoError("");
			setPartyEmailError("");
			setPartyAddressError("");
		}

		function removeAllErrors() {
			setPartyCode("");
			setPartyName("");
			setPartyPhoneNo("");
			setPartyEmail("");
			setPartyAddress("");
			setGeneralError("");
		}

		function clearModal() {
			setShowModal(false);
			removeAllErrors();
			resetAllInputs();
			setEditId("");
		}

		function savePartyInfo() {

		}

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
							<Table.Body dataArray={[]}/>
						</Table>
					</div>
				</div>
			</div>
		);
	}

	export default PartyDefinitions;

}