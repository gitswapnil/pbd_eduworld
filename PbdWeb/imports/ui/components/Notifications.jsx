import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';
import SimpleSchema from 'simpl-schema';
import { ReactiveVar } from 'meteor/reactive-var';

if(Meteor.isServer) {
	import admin from "firebase-admin";

	Meteor.publish('notifications.getAll', function({ skip, limit }){
		console.log("Publishing the notifications.getAll... got inputs as, skip: " + skip + ", limit: " + limit);
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			const totalPages = Math.ceil(Collections.notifications.find({}).count() / limit);
			this.added("temp", "notificInfo", { totalPages });

			const handle1 = Collections.notifications.find({}, { sort: { createdAt: -1 }, skip, limit }).observeChanges({
				added: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(fields));
					this.added('notifications', _id, doc);
				},

				changed: (_id, doc) => {
					// console.log("Fields added: " + JSON.stringify(fields));
					const tempDoc = Collections.notifications.findOne({ _id });
					this.changed('notifications', _id, doc);
				},

				removed: (_id) => {
					this.removed('notifications', _id);
				}
			});

			Meteor.roleAssignment.find({"role._id": "executive"}).fetch().forEach(role => {
				const userObj = Meteor.users.findOne({ _id: role.user._id }, {fields: {"profile.name": 1}});
				userObj.isExecutive = true;

				this.added('users', userObj._id, userObj);
			});

			console.log("data publication for \"notifications.getAll is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				// handle2.stop();
				console.log("Publication, \"notifications.getAll\" is stopped.");
			});
		} else {
			this.ready();
		}
	});

	Meteor.methods({
		'notifications.send'(notificationData) {
			console.log("Sending the notification...");
			// console.log("notificationData: " + JSON.stringify(notificationData));

			if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
				let tokens = [];

				notificationData.execs.forEach(exec => {
					const user = Meteor.users.findOne({ _id: exec.id });
					if(user.appToken && (typeof user.appToken === "string")) {
						tokens.push(user.appToken);
					}
				});

				var message = {
				  	data: {
				    	type: notificationData.type,
				    	text: notificationData.text,
				  	},
				  	// notification: {
				  	// 	title: notificationData.type,
				  	// 	body: notificationData.text
				  	// },
				  	tokens: tokens
				};

				if(notificationData.img) {					
					message.data.img = Meteor.absoluteUrl(`api/notificationimg/${notificationData._id}`);
				}

				// console.log('message: ', JSON.stringify(message));

				admin.messaging().sendMulticast(message).then((response) => {
					let newExecArr = [...notificationData.execs];
					console.log('Successfully sent message:', response);
					if (response.successCount > 0) {
						response.responses.forEach((resp, idx) => {
					        if (resp.success) {
					        	newExecArr[idx].status = true
					        }
				      	});

				      	Collections.notifications.update({ _id: notificationData._id }, { $set: { execs: newExecArr } }, { multi: false });
				    }
				}).catch((error) => {
					console.log('Error sending message:', error);
				});
			};

		}
	})
}

let reactiveError = new ReactiveVar("{}");

Meteor.methods({
	'notifications.sendNotification'(inputs) {		//if editId is given, then it is a method to edit the executive's details.
		console.log("notifications.sendNotification method with inputs: " + JSON.stringify(inputs));

		let schemaObj = {
			notificationText: { 
				type: String, 
				min: 1,
				max: 5000,
				label: "Notification Text"
			},
			notificationImg: { 
				type: String,
				label: "Notification Image",
				optional: true
			},
			notificationType: { 
				type: String,
				allowedValues: ["info", "warn"],
				label: "Notification Type"
			},
			selectedExIds: {
				type: Array,
				minCount: 1,
				label: "Selected Executives"
			},
			"selectedExIds.$": {
				type: String
			}
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

		if(Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {		//authorization
			console.log("Inserting notification...");

			const notificationContent = {
				text: cleanedInputs.notificationText,
				img: cleanedInputs.notificationImg,
				type: cleanedInputs.notificationType,
				execs: cleanedInputs.selectedExIds.map(execId => { return { id: execId, status: false } }),
				createdAt: new Date(),
			};

			const notificationId = Collections.notifications.insert(notificationContent);

			console.log("Notification inserted. Now sending the notification...");

			if(!this.isSimulation) {
				Meteor.call("notifications.send", {...notificationContent, _id: notificationId});
			}
		}

		console.log("notifications.sendNotification method is completed successfully.");
		return "Notification sent successfully";
	},
});

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faPaperPlane, faBell, faFileImage, faTrashAlt, faPencilAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';
	import { Tracker } from 'meteor/tracker';
	import Table from './Table.jsx';
	import Modal from './Modal.jsx';

	const Notifications = (props) => {
		const [showModal, setShowModal] = useState(false);
		const [notifications, setNotifications] = useState(null);
		const [selectedPage, setSelectedPage] = useState(1);
		const [totalPages, setTotalPages] = useState(1);

		const [notificationText, setNotificationText] = useState("");
		const [notificationTextError, setNotificationTextError] = useState("");

		const [notificationImg, setNotificationImg] = useState("");
		const [notificationImgError, setNotificationImgError] = useState("");

		const [notificationType, setNotificationType] = useState("info");
		const [notificationTypeError, setNotificationTypeError] = useState("");

		const [executives, setExecutives] = useState([]);
		const [executivesError, setExecutivesError] = useState("");

		const [editId, setEditId] = useState("");

		const [generalError, setGeneralError] = useState("");

		const [sendingNotification, setSendingNotification] = useState(false);

		const viewLimit = 10;

		function clearModal() {
			setShowModal(false);
			removeAllErrors();
			resetAllInputs();
			setEditId("");
			setSendingNotification(false);
		}

		function resetAllInputs() {
			setNotificationImg("");
			setNotificationText("");
			setNotificationType("info");
			const exs = Meteor.users.find({ isExecutive: true }).map(executive => Object.assign(executive, { selected: false }));
			setExecutives(exs);
		}

		function removeAllErrors() {
			setNotificationImgError("");
			setNotificationTextError("");
			setNotificationTypeError("");
			setExecutivesError("");
		}

		function fillModal(editId) {
			const notification = Collections.notifications.findOne({ _id: editId });
			console.log("notification: " + JSON.stringify(notification));
			// const party = Meteor.users.findOne({"_id": editId});
			setEditId(editId);
			setNotificationText(notification.text);
			setNotificationImg(notification.img || "");
			setNotificationType(notification.type);
			
			if(notification.execs) {
				const exs = Meteor.users.find({ isExecutive: true }).map(executive => {
					let executv = notification.execs.find(exec => exec.id === executive._id)
					return Object.assign(executive, { selected: (typeof executv) !== "undefined", status: (executv && executv.status) });
				});

				setExecutives(exs);
			}

			setShowModal(true);
		}

		function onPageSelected(pageNo) {
			// console.log("pageNo: " + pageNo);
			setSelectedPage(pageNo);
		}

		function sendNotification() {
			setSendingNotification(true);

			Tracker.autorun(() => {
				removeAllErrors();			//remove all the errors before setting the new messages.
				const errorObj = JSON.parse(reactiveError.get());
				console.log("errorObj: " + JSON.stringify(errorObj));
				for(let [key, value] of Object.entries(errorObj)) {
					switch(key) {
						case "notificationText": setNotificationTextError(value); break;
						case "notificationImg": setNotificationImgError(value); break;
						case "notificationType": setNotificationTypeError(value); break;
						case "selectedExIds": setExecutivesError(value); break;
					}
				}
			});

			//get the selected executives.
			let selectedExIds = [];
			executives.forEach(executive => {
				if(executive.selected) {
					selectedExIds.push(executive._id);
				}
			});

			Meteor.apply('notifications.sendNotification', 
				[{ notificationText, notificationImg, notificationType, selectedExIds }], 
				{returnStubValues: true, throwStubExceptions: true}, 
				(err, res) => {
					// console.log("err: " + err);
					if(err){
						if(err.reason == "validation-error") {		//if validation error occurs
							// console.log("err.details: " + err.details);
							reactiveError.set(err.details);
						} else if(err.error == 403) {
							
						}
					} else {		//when success, 
						// console.log("res: " + res);
						// clearModal();
						setSelectedPage(1);
					}

					clearModal();
				});
		}

		function removeNotificationImg() {
			setNotificationImg("")
		}

		useEffect(() => {
			const skip = (selectedPage - 1) * viewLimit;
			const handle = Meteor.subscribe('notifications.getAll', { skip, limit: viewLimit }, {
				onStop(error) {
					console.log("notifications.getAll is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("notifications.getAll is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					let arr = Collections.notifications.find({}, { sort: { createdAt: -1 } }).map((doc, index) => {
						return {
							cells: [
								{ content: skip + (index + 1)}, 
								{ content: doc.text}, 
								{ content: (doc.img || (doc.img !== "")) ? <img width="100px" src={doc.img}/> : "" }, 
								{ content: doc.type}, 
								{ content: moment(doc.createdAt).format("Do MMM YYYY h:mm:ss a")},
							],
							rowAttributes: {
								key: doc._id,
								className: "row-selectable",
								onClick: fillModal.bind(this, doc._id)
							}
						}
					});

					const notificInfo = Collections.temp.findOne({ _id: "notificInfo" });
					if(notificInfo && notificInfo.totalPages) {
						setTotalPages(notificInfo.totalPages);
					}

					setNotifications(arr);

					const exs = Meteor.users.find({ isExecutive: true }).map(executive => Object.assign(executive, { selected: false }));
					setExecutives(exs);
				}
			});

			return function() {
				handle.stop();
			}
		}, [selectedPage])

		return (
			<div className="container">
				<br/>
				<div className="row">
					<div className="col-12 text-right">
					{/*----------- Modal Data goes here --------------*/}
						<button type="button" className="btn btn-primary" style={{"boxShadow": "1px 2px 3px #999"}} onClick={() => setShowModal(true)}>
							<FontAwesomeIcon icon={faBell} size="sm"/>&nbsp;&nbsp;Send new notification&nbsp;&nbsp;
						</button>

						<Modal 	show={showModal} 
								onHide={clearModal} 
								customOkButton={
									editId == "" ?
										sendingNotification ? 

										<button type="button" className="btn btn-primary" disabled>
											<FontAwesomeIcon icon={faSpinner} spin/>&nbsp;&nbsp;Sending Notification...
										</button>

										:

										<button type="button" className="btn btn-primary" onClick={sendNotification}>
											<FontAwesomeIcon icon={faPaperPlane}/>&nbsp;&nbsp;Send Notification
										</button>
									: null
								}>
							<Modal.Title>
								<FontAwesomeIcon icon={faBell} size="lg"/> &nbsp;&nbsp;{(editId === "") ? "Send New Notification" : "Notification details"}
							</Modal.Title>

							<Modal.Body>
								<form>
									<div className="row">
										<div className="col-7 border-right">
											<div className="form-group row">
										    	<label htmlFor="inNotificationText" className="col-4 col-form-label-sm text-right">Notification Text<b className="text-danger">*</b>:</label>
										    	<div className="col-8">
										    		<textarea 	value={notificationText} 
										    					type="text"
										    					id="inNotificationText"
										    					className={`form-control form-control-sm ${(notificationTextError === "") ? "" : "is-invalid"}`}
																style={{ width: "100%" }}
																disabled={editId != ""}
																onChange={e => setNotificationText(e.target.value)}/>
										      		<div className="invalid-feedback text-left">
											        	{notificationTextError}
											        </div>
										    	</div>
											</div>
											<div className="form-group row">
												<label htmlFor="inNotificationImage" className="col-4 col-form-label-sm text-right">Notification Image (optional):</label>
										    	<div className="col-8 text-center">
													{
														(notificationImg == "") ? 
														<div style={{"border": "1px solid #ccc", "borderRadius": "3px", "padding": "20px"}}>
															<FontAwesomeIcon icon={faFileImage} size="7x" style={{"color": "#aaa"}}/>
														</div>
														: 
														<img src={notificationImg} className="img-thumbnail"/> 
													}
													<small className="text-danger">
											        	{(notificationImgError == "") ? "" : notificationImgError} 
											        </small>
												</div>
												{
													(editId == "") ? 
													<div className="text-right col-12">
														<input 	type="file" 
																className="custom-file-input" 
																id="inFilenotificationImg" 
																hidden={true} 
																accept="image/*" 
																onChange={(event) => {
																	const file = event.target.files[0];
																	const reader = new FileReader();

																	reader.readAsDataURL(file);
																	reader.onload = () => {
																		// console.log(reader.result);
																		setNotificationImg(reader.result);
																	}

																	reader.onerror = () => {
																		// console.log(reader.error);
																		setNotificationImgError(reader.error);
																	}
																}}/>
														{
															(notificationImg == "") ?
															<button type="button" className="btn btn-light btn-sm" onClick={() => { $('#inFilenotificationImg').click() }}>
																<FontAwesomeIcon icon={faPencilAlt} size="sm"/>&nbsp;Edit
															</button>
															:
															<button type="button" className="btn btn-light btn-sm" onClick={removeNotificationImg}>
																<FontAwesomeIcon icon={faTrashAlt} size="sm"/>&nbsp;Remove
															</button> 
														}
													</div>
													: null
												}
											</div>
											<div className="form-group row">
										    	<label htmlFor="inNotificationText" className="col-4 col-form-label-sm text-right">Notification Type<b className="text-danger">*</b>:</label>
										    	<div className="col-8">
										    		<select className="custom-select" 
										    				value={notificationType} 
										    				onChange={e => setNotificationType(e.target.value)} 
										    				disabled={editId != ""}>
										    			<option value="info">Information</option>
										    			<option value="warn">Warning</option>
										    		</select>
										      		<div className="invalid-feedback text-left">
											        	{notificationTypeError}
											        </div>
										    	</div>
											</div>
										</div>
										<div className="col-5 text-left">
											Select executive from the list:
											<div className="form-check">
									    		<input 	className="form-check-input" 
									    				type="checkbox" 
									    				checked={(() => {
									    					const selectedArr = executives.map(executive => executive.selected)
									    					return (selectedArr.indexOf(false) == -1);
									    				})()} 
									    				id="defaultCheck1" 
									    				disabled={editId != ""}
									    				onChange={e => {
									    						const newExecutives = executives.map(executive => Object.assign(executive, {selected: e.target.checked}));
									    						setExecutives(newExecutives);
									    					}
									    				}/>
												<label className="form-check-label" htmlFor="defaultCheck1">All</label>
											</div>
											<div style={{height: "350px", overflowY: "auto"}}>
												<ul className="list-group">
								      				{
								      					executives.map((executive, index) => 
															<li key={executive._id} className="list-group-item">
																<div className="form-check">
														    		<input 	className="form-check-input" 
														    				type="checkbox" 
														    				checked={executive.selected}
														    				disabled={editId != ""}
														    				onChange={(e => {
														    					const newExecutives = [...executives];
														    					newExecutives[index].selected = e.target.checked;
														    					setExecutives(newExecutives);
														    				}).bind(index)} 
														    				id={`${executive._id}-${index}`}/>
																	<label className="form-check-label" htmlFor={`${executive._id}-${index}`}>
																		{executive.profile.name}&nbsp;
																		{
																			(typeof executive.status !== "undefined") ? 
																				(executive.status) ? <small className="text-success">Sent</small> : <small className="text-danger">Failed</small>
																			: null
																		}
																	</label>
																</div>
															</li>
								      					)
								      				}
												</ul>
											</div>
											<small className="text-danger">
									        	{(executivesError == "") ? "" : executivesError} 
									        </small>
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
								{ "content": "Text" },
								{ "content": "Image" },
								{ "content": "Type" }, 
								{ "content": "Sent At" },
							]}/>
							<Table.Body dataArray={notifications}/>
						</Table>
					</div>
				</div>
			</div>
		)
	}

	export default Notifications;
}
