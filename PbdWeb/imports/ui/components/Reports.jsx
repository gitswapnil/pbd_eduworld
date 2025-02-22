import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	import ExcelJS from 'exceljs';
	import { Random } from 'meteor/random';
	import fs from 'fs';
	import PdfMake from 'pdfmake';
	import { getReasonFromCode, DUTY_START_TIME, DUTY_END_TIME } from 'meteor/pbd-apis';

	Meteor.publish('reports.getCollections', function({from, to}){
		console.log("Publishing the reports.getCollections...");
		console.log("from: " + from + ", to: " + to);
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			const noOfDays = moment(to).diff(moment(from), "days") + 1;

			let initializing = true;

			const getCollectionsPie = async () => {
				const executor = (resolve, reject) => {
					Collections.receipts.rawCollection().aggregate([
						{
					        $match: {
					            createdAt: {
					                $gte: from,
					                $lte: to
					            }
					        }
					    },
					    {
					        $lookup: {
					            from: "users",
					            localField: "userId",
					            foreignField: "_id",
					            as: "userInfo"
					        }
					    },
					    {
					        $unwind: "$userInfo"
					    },
					    {
					        $project: {
					            _id: 1,
					            receiptNo: 1,
					            amount: 1,
					            name: "$userInfo.profile.name",
					            receiptSeries: "$userInfo.profile.receiptSeries",
					            userId: 1,
					            createdAt: 1,
					        }
					    },
					    {
					        $sort: { createdAt: 1 }
					    },
					    {
					        $group: {
					            _id: { $concat: ["$receiptSeries", { $convert: { input: "$receiptNo", to: "string"}}] },
					            amount: { $last: "$amount" },
					            userId: { $last: "$userId" },
					            name: { $last: "$name" },
					            createdAt: { $last: "$createdAt" },
					        }
					    },
					    {
					        $group: {
					            _id: "$userId",
					            amount: { $sum: "$amount" },
					            name: { $first: "$name" },
					            createdAt: { $first: "$createdAt" }
					        }
					    },
					    {
					    	$sort: { createdAt: 1 }
					    }
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);

							resolve.apply(this, [docs]);
						}).bind(this));
					}).bind(this));
				}

				const prmse = new Promise(executor.bind(this));

				const result = await prmse;

				if(Array.isArray(result) && result.length == 1) {
					result.push({ _id: "fakeId", amount: 0, name: "" });
				}

				return result;
			};

			const getCollectionsLine = async () => {
				const executor = (resolve, reject) => {
					Collections.receipts.rawCollection().aggregate([
						{
						    $match: {
						        createdAt: {
						            $gte: from,
						            $lte: to
						        }
						    }
						},
						{
						    $lookup: {
						        from: "users",
						        localField: "userId",
						        foreignField: "_id",
						        as: "userInfo"
						    }
						},
						{
						    $unwind: "$userInfo"
						},
						{
						    $project: {
						        _id: 1,
						        receiptNo: 1,
						        amount: 1,
						        receiptSeries: "$userInfo.profile.receiptSeries",
						        createdAt: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
						        // createdAt: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt", timezone: "Asia/Kolkata" } },
						    }
						},
						{
						    $group: {
						        _id: { $concat: ["$receiptSeries", { $convert: { input: "$receiptNo", to: "string"}}] },
						        amount: { $last: "$amount" },
						        createdAt: { $last: "$createdAt" },
						    }
						},
						{
						    $group: {
						        _id: "$createdAt",
						        amount: { $sum: "$amount" },
						        createdAt: { $first: "$createdAt" },
						    }
						},
						    {
						        $project: {
						            _id: 1,
						            amount: 1,
						            createdAt: { $dateFromString: { dateString: "$createdAt", format: "%d-%m-%Y" } }
						            // createdAt: { $dateFromString: { dateString: "$createdAt", format: "%d-%m-%Y", timezone: "Asia/Kolkata" } }
						        }
						    },
						{
							$sort: { createdAt: 1 }
						}
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);

							let retArr = [];
							let serialDate = moment(from);

							// console.log("docs: " + JSON.stringify(docs));

							if(docs && (noOfDays > 1) && (docs.length) && (docs.length < noOfDays)) {
								for(let i = 1; i <= noOfDays; i++){
									const matchFound = docs.filter(doc => moment(doc.createdAt).isSame(serialDate, "day"));
									// console.log("matchFound: " + JSON.stringify(matchFound));
									if(matchFound.length) {
										retArr.push(matchFound[0]);
									} else {
										retArr.push({ _id: `fake${i}`, amount: 0, createdAt: serialDate.toDate() });
									}

									serialDate.add(1, "days");
								}
							} else {
								retArr = docs;
							}

							resolve.apply(this, [retArr]);
						}).bind(this));
					}).bind(this));
				}

				const prmse = new Promise(executor.bind(this));

				const result = await prmse;

				if(Array.isArray(result) && result.length == 1) {
					result.splice(0, 0, { _id: "fakeId1", amount: 0, createdAt: moment(result[0].createdAt).subtract(1, "days").toDate() });
					result.push({ _id: "fakeId2", amount: 0, createdAt: moment(result[result.length - 1].createdAt).add(1, "days").toDate() });
				}

				return result;
			};

			const handle1 = Collections.receipts.find({ createdAt: { $gte: from, $lte: to } }).observeChanges({
				added: (_id, doc) => {
					if(!initializing) {
						getCollectionsPie.apply(this).then(docs => {
							this.changed("receipts", "collectionsPie", { docs });
						}).catch(err => {
							throw new Meteor.Error("publication-error", err);
						});

						getCollectionsLine.apply(this).then(docs => {
							this.changed("receipts", "collectionsLine", { docs });
						}).catch(err => {
							throw new Meteor.Error("publication-error", err);
						});
					}
				}
			});

			const pieChartData = getCollectionsPie().catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			const lineChartData = getCollectionsLine().catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			const waitForTasks = async () => {
				const result = await Promise.all([pieChartData, lineChartData]);
				// console.log("result: " + JSON.stringify(result));

				this.added("receipts", "collectionsPie", { docs: result[0] });
				this.added("receipts", "collectionsLine", { docs: result[1] });

				initializing = false;
			};

			waitForTasks.apply(this).catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			console.log("data publication for \"reports.getCollections is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				this.stop();
				console.log("Publication, \"reports.getCollections\" is stopped.");
			});
		} else {
			this.ready();
		}
	});

	Meteor.publish('reports.getEfficiencies', function({from, to}){
		console.log("Publishing the reports.getEfficiencies...");
		console.log("from: " + from + ", to: " + to);
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			let initializing = true;
			const execIds = Meteor.roleAssignment.find({"role._id": "executive"}).map(roleObj => roleObj.user._id);
			const currentExecutives = Meteor.users.find({ _id: { $in: execIds } }).fetch();

			const getEfficienciesBar = async () => {
				const executor = (resolve, reject) => {
					const noOfDays = moment(to).diff(moment(from), "days") + 1;

					Collections.receipts.rawCollection().aggregate([
						{
					        $match: {
					            createdAt: {
					                $gte: from,
					                $lte: to
					            }
					        }
					    },
					    {
					        $lookup: {
					            from: "users",
					            localField: "userId",
					            foreignField: "_id",
					            as: "userInfo"
					        }
					    },
					    {
					        $unwind: "$userInfo"
					    },
					    {
					        $project: {
					            _id: 1,
					            receiptNo: 1,
					            amount: 1,
					            name: "$userInfo.profile.name",
					            receiptSeries: "$userInfo.profile.receiptSeries",
					            userId: 1,
					            createdAt: 1,
					        }
					    },
					    {
					        $sort: { createdAt: 1 }
					    },
					    {
					        $group: {
					            _id: { $concat: ["$receiptSeries", { $convert: { input: "$receiptNo", to: "string"}}] },
					            amount: { $last: "$amount" },
					            userId: { $last: "$userId" },
					            name: { $last: "$name" },
					            createdAt: { $last: "$createdAt" },
					        }
					    },
					    {
					        $group: {
					            _id: "$userId",
					            amount: { $sum: "$amount" },
					            name: { $first: "$name" },
					            createdAt: { $first: "$createdAt" }
					        }
					    },
					    {
                            $project: {
                                _id: 1,
                                average: { $divide: [ "$amount", noOfDays ] },
                                name: 1,
                                createdAt: 1
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                average: { $round: [ "$average", 2 ] },
                                name: 1,
                                createdAt: 1
                            }
                        },
					    {
					    	$sort: { createdAt: 1 }
					    }
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);
							// console.log("docs: " + JSON.stringify(docs));

							let retArr = [];
							if(docs && docs.length) {
								retArr = currentExecutives.map(executive => {
									let execFound = docs.filter(doc => doc._id === executive._id);
									if(execFound.length) {
										return { _id: execFound[0]._id, average: execFound[0].average, name: execFound[0].name, createdAt: execFound[0].createdAt };
									} else {
										return { _id: executive._id, average: 0, name: executive.profile.name };
									}
								});
							}

							resolve.apply(this, [retArr]);
						}).bind(this));
					}).bind(this));
				}

				const prmse = new Promise(executor.bind(this));

				const result = await prmse;

				// if(Array.isArray(result) && result.length == 1) {
				// 	result.push({ _id: "fakeId", average: 0, name: "" });
				// }

				return result;
			};

			const handle1 = Collections.receipts.find({ createdAt: { $gte: from, $lte: to } }).observeChanges({
				added: (_id, doc) => {
					if(!initializing) {
						getEfficienciesBar.apply(this).then(docs => {
							this.changed("receipts", "efficienciesBar", { docs });
						}).catch(err => {
							throw new Meteor.Error("publication-error", err);
						});
					}
				}
			});

			getEfficienciesBar.apply(this).then(docs => {
				this.added("receipts", "efficienciesBar", { docs });

				initializing = false;
			}).catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			console.log("data publication for \"reports.getEfficiencies is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				this.stop();
				console.log("Publication, \"reports.getEfficiencies\" is stopped.");
			});
		} else {
			this.ready();
		}
	});

	Meteor.publish('reports.getWorkReports', function({format, from, to}){
		console.log("Publishing the reports.getWorkReports...");
		console.log("reports.getWorkReports method with format: " + format + ", from: " + from + ", to: " + to);

		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			const fileName = `${Random.hexString(10)}.${(format === "excel") ? "xls" : "pdf"}`;

			let workbook = new ExcelJS.Workbook();
			workbook.creator = 'PBD Executives reports dashboard';
			workbook.created = new Date();
			const normalText = { name: 'Calibri', family: 2, size: 10, scheme: 'minor' };
			const boldTextProps = { name: 'Calibri', family: 2, size: 10, scheme: 'minor', bold: true };

			const getData = async () => {
				const executor = (resolve, reject) => {
					Meteor.users.rawCollection().aggregate([
						{
					        $lookup: {
					            from: "role-assignment",
					            foreignField: "user._id",
					            localField: "_id",
					            as: "assignedRoleObject",
					        }
					    },
					    { $unwind: "$assignedRoleObject" },
					    {
					        $match: {
					            "assignedRoleObject.role._id": "executive",
					        }
					    },
					    {
					        $lookup: {
					            from: "tasks",
					            foreignField: "userId",
					            localField: "_id",
					            as: "tasks"
					        }
					    },
					    {
					        $lookup: {
					            from: "receipts",
					            foreignField: "userId",
					            localField: "_id",
					            as: "receipts"
					        }
					    },
					    {
					        $lookup: {
					            from: "followUps",
					            foreignField: "userId",
					            localField: "_id",
					            as: "followUps"
					        }
					    },
					    {
					        $unwind: { path: "$tasks", preserveNullAndEmptyArrays: true }
					    },
					    {
					        $project: {
					            _id: 1,
					            execName: { $concat: [ "$profile.name", " (", "$username", ")" ] },
					            receiptSeries: "$profile.receiptSeries",
					            otherTask: {
					                $cond: [
					                    { $eq: ["$tasks.type", 1] },
					                    {
					                        type: "$tasks.type",
					                        date: "$tasks.createdAt",
					                        subject: "$tasks.subject",
					                        remarks: "$tasks.remarks",
					                        createdAt: "$tasks.createdAt",
					                    },
					                    null
					                ]
					            },
					            
					            visitedTask: {
					                $cond: [
					                    { $eq: ["$tasks.type", 0] },
					                    {
					                        taskId: "$tasks._id",
					                        type: "$tasks.type",
					                        partyId: "$tasks.partyId",
					                        cpName: "$tasks.cpName",
					                        cpNumber: "$tasks.cpNumber",
					                        reason: "$tasks.reason",
					                        doneWithTask: "$tasks.doneWithTask",
					                        remarks: "$tasks.remarks",
					                        userId: "$tasks.userId",
					                        createdAt: "$tasks.createdAt"
					                    },
					                    null
					                ]
					            },
					            receipts: 1,
					            followUps: 1,
					        }
					    },
					    {
					        $lookup: {
					            from: "users",
					            foreignField: "_id",
					            localField: "visitedTask.partyId",
					            as: "partyDetails"
					        }
					    },
					    {
					        $unwind: { path: "$partyDetails", preserveNullAndEmptyArrays: true }
					    },
					    {
					        $project: {
					            _id: 1,
					            execName: 1,
					            receiptSeries: 1,
					            otherTask: 1,
					            visitedTask: {
					                $cond: [
					                    { $ne: [ "$visitedTask", null ] }, 
					                    {
					                        taskId: "$visitedTask.taskId",
					                        type: "$visitedTask.type",
					                        partyName: "$partyDetails.profile.name",
					                        partyAddress: "$partyDetails.profile.address",
					                        partyCode: "$partyDetails.username",
					                        cpName: "$visitedTask.cpName",
					                        cpNumber: "$visitedTask.cpNumber",
					                        doneWithTask: "$visitedTask.doneWithTask",
					                        reason: "$visitedTask.reason",
					                        remarks: "$visitedTask.remarks",
					                        createdAt: "$visitedTask.createdAt"
					                    },
					                    null
					                ]
					            },
					            receipts: 1,
					            followUps: 1
					        }
					    },
					    {
					        $group: {
					            _id: "$_id",
					            "execName": { $first: "$execName" },
					            "receiptSeries": { $first: "$receiptSeries" },
					            "otherTask": {
					                $addToSet: {
					                    $cond: [
					                        { $eq: ["$otherTask", null] },
					                        null,
					                        {
					                            type: "$otherTask.type",
					                            date: { $dateToString: { date: "$otherTask.createdAt", format: "%d-%m-%Y", timezone: "Asia/Kolkata" } },
					                            subject: "$otherTask.subject",
					                            remarks: "$otherTask.remarks",
					                            createdAt: "$otherTask.createdAt",
					                        }
					                    ]
					                }
					            },
					            
					            "visitedTask": {
					                $addToSet: {
					                    $cond: [
					                        { $eq: ["$visitedTask", null] },
					                        null,
					                        {
					                            taskId: "$visitedTask.taskId",
					                            type: "$visitedTask.type",
					                            date: { $dateToString: { date: "$visitedTask.createdAt", format: "%d-%m-%Y", timezone: "Asia/Kolkata" } },
					                            partyName: "$visitedTask.partyName",
					                            partyAddress: "$visitedTask.partyAddress",
					                            partyCode: "$visitedTask.partyCode",
					                            cpName: "$visitedTask.cpName",
					                            cpNumber: "$visitedTask.cpNumber",
					                            doneWithTask: "$visitedTask.doneWithTask",
					                            reason: "$visitedTask.reason",
					                            remarks: "$visitedTask.remarks",
					                            createdAt: "$visitedTask.createdAt"
					                        },
					                    ]
					                }
					            },
					            receipts: { $first: "$receipts" },
					            followUps: { $first: "$followUps" },
					        }
					    },
					    {
					        $project: {
					            _id: 1,
					            execName: 1,
					            receiptSeries: 1,
					            otherTasks: {
					                $filter: {
					                    input: "$otherTask",
					                    as: "otherTask",
					                    cond: { $ne: [ "$$otherTask", null ] }
					                }
					            },
					            visitedTasks: {
					                $filter: {
					                    input: "$visitedTask",
					                    as: "visitedTask",
					                    cond: { $ne: [ "$$visitedTask", null ] }
					                }
					            },
					            receipts: 1,
					            followUps: 1
					        }
					    },
					    { $unwind: { path: "$receipts", preserveNullAndEmptyArrays: true } },
					    {
					        $lookup: {
					            from: "users",
					            foreignField: "_id",
					            localField: "receipts.partyId",
					            as: "partyDetails",
					        }
					    },
					    {
					        $project: {
					            _id: 1,
					            execName: 1,
					            receipts: {
					                _id: "$receipts._id",
					                receiptNo: { $concat: [ "$receiptSeries", { $toString: "$receipts.receiptNo" } ] },
					                date: { $dateToString: { date: "$receipts.createdAt", format: "%d-%m-%Y", timezone: "Asia/Kolkata" } },
					                partyDetails: {
					                    name: { $arrayElemAt: ["$partyDetails.profile.name", 0] },
					                    address: { $arrayElemAt: ["$partyDetails.profile.address", 0] },
					                    phoneNumber: { $arrayElemAt: ["$partyDetails.profile.phoneNumber", 0] },
					                    partyCode: { $arrayElemAt: ["$partyDetails.username", 0] },
					                },
					                cpList: 1,
					                amount: 1,
					                paidBy: 1,
					                payment: 1,
					                chequeNo: 1,
					                ddNo: 1,
					                bankName: 1,
					                bankBranch: 1,
					                receivedAt: { 
					                	$cond: [
					                		{ $not: "$receipts.receivedAt" },
					                		"$$REMOVE",
					                		{ $dateToString: { date: "$receipts.receivedAt", format: "%d-%m-%Y %H:%M:%S", timezone: "Asia/Kolkata" } },
					                	]
					                },
					                createdAt: 1,
					            },
					            followUps: 1,
					            otherTasks: 1,
					            visitedTasks: 1,
					        }
					    },
					    {
					        $group: {
					            _id: "$_id",
					            execName: { $first: "$execName" },
					            receipts: { $addToSet: "$receipts" },
					            followUps: { $first: "$followUps" },
					            otherTasks: { $first: "$otherTasks" },
					            visitedTasks: { $first: "$visitedTasks" },
					        }
					    },
					    {
					    	$project: {
					    		_id: 1,
					    		execName: 1,
					    		visitedTasks: {
					    			$filter: {
					                    input: "$visitedTasks",
					                    as: "visitedTasks",
					                    cond: {
					                        "$and": [
					                            { "$gte": ["$$visitedTasks.createdAt", from] },
					                            { "$lte": ["$$visitedTasks.createdAt", to] }
					                        ]
					                    }
					                }
					    		},
					    		otherTasks: {
					    			$filter: {
					                    input: "$otherTasks",
					                    as: "otherTasks",
					                    cond: {
					                        "$and": [
					                            { "$gte": ["$$otherTasks.createdAt", from] },
					                            { "$lte": ["$$otherTasks.createdAt", to] }
					                        ]
					                    }
					                }
					    		},
					    		receipts: {
					    			$filter: {
					                    input: "$receipts",
					                    as: "receipts",
					                    cond: {
					                        "$and": [
					                            { "$gte": ["$$receipts.createdAt", from] },
					                            { "$lte": ["$$receipts.createdAt", to] }
					                        ]
					                    }
					                }
					    		},
					    		followUps: {
					    			$filter: {
					                    input: "$followUps",
					                    as: "followUps",
					                    cond: {
					                        "$and": [
					                            { "$gte": ["$$followUps.createdAt", from] },
					                            { "$lte": ["$$followUps.createdAt", to] }
					                        ]
					                    }
					                }
					    		},
					    	}
					    }
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);
							console.log("docs: " + JSON.stringify(docs));

							resolve.apply(this, [docs]);
						}).bind(this));
					}).bind(this));
				};

				const prmse = new Promise(executor.bind(this));

				const result = await prmse;

				// if(Array.isArray(result) && result.length == 1) {
				// 	result.push({ _id: "fakeId", average: 0, name: "" });
				// }

				return result;
			};

			getData.apply(this).then(docs => {
				if(format === "excel") {
					docs.forEach((exec, execIndex) => {
						let worksheet = workbook.addWorksheet(exec.execName, {
											pageSetup:{
												paperSize: 9, 
												orientation:'landscape'
											}
										});
						worksheet.addRow([`Name: ${exec.execName}`]);
						worksheet.mergeCells('A1:F1');
						worksheet.getCell('A1').style.font = { ...boldTextProps, size: 14 };
						worksheet.getRow(1).height = 20;

						worksheet.addRow(["Visits"]);
						worksheet.mergeCells('A2:F2');
						worksheet.getCell('A2').alignment = { horizontal: 'center' };
						worksheet.getCell('A2').style.font = { ...boldTextProps, size: 12 };
						worksheet.addRow(["SI No.", "Date", "Visited Party", "Party Code", "Contact Person", "Reason", "Remarks"]);

						worksheet.getColumn(2).width = 20;
						worksheet.getColumn(3).width = 40;
						worksheet.getColumn(4).width = 10;
						worksheet.getColumn(5).width = 20;
						worksheet.getColumn(6).width = 20;
						worksheet.getColumn(7).width = 20;
						worksheet.getColumn(8).width = 30;
						worksheet.getColumn(9).width = 30;
						worksheet.getColumn(12).width = 60;

						worksheet.getRow(1).style.font = boldTextProps;
						worksheet.getRow(2).style.font = boldTextProps;
						worksheet.getRow(3).style.font = boldTextProps;

						const visitedTasks = exec.visitedTasks.sort((a, b) => b.createdAt - a.createdAt);

						visitedTasks.forEach((visitedTask, visitIndex) => {
							const si = ++visitIndex;
							worksheet.addRow([si, visitedTask.date, `${visitedTask.partyName}\n${visitedTask.partyAddress}`, visitedTask.partyCode, `${visitedTask.cpName}\n(${visitedTask.cpNumber})`, getReasonFromCode(visitedTask.reason), visitedTask.remarks]);
							worksheet.getRow(3 + si).height = 30;
							worksheet.getRow(3 + si).style.font = normalText;
						});

						worksheet.addRow([]);

						worksheet.addRow(["Receipts"]);

						let receiptsStartIndex = 3 + exec.visitedTasks.length + 2;

						worksheet.mergeCells(`A${receiptsStartIndex}:F${receiptsStartIndex}`);
						worksheet.getCell(`A${receiptsStartIndex}`);
						worksheet.getCell(`A${receiptsStartIndex}`).alignment = { horizontal: 'center' };
						worksheet.getCell(`A${receiptsStartIndex}`).style.font = { ...boldTextProps, size: 12 };

						receiptsStartIndex++;

						worksheet.addRow([
							"SI No.", 
							"Date", 
							"Receipt to Party", 
							"Party Code", 
							"Receipt No.", 
							"Paid Amt.", 
							"Payment By", 
							"DD/Cheque No.",
							"Bank", 
							"Branch", 
							"Payment", 
							"receivedAt",
							"Sent To"
						]);

						worksheet.getRow(receiptsStartIndex).style.font = boldTextProps;

						const receipts = exec.receipts.sort((a, b) => b.createdAt - a.createdAt);
						receipts.forEach((receipt, receiptIndex) => {
							receiptsStartIndex++;
							worksheet.addRow([
								++receiptIndex, 
								receipt.date, 
								`${receipt.partyDetails.name}\n${receipt.partyDetails.address}`, 
								receipt.partyDetails.partyCode, 
								receipt.receiptNo, 
								receipt.amount, 
								(receipt.paidBy === 0) ? "Cash" : (receipt.paidBy === 1) ? "Cheque" : (receipt.paidBy === 2) ? "Demand Draft" : " ",
								(receipt.paidBy === 0) ? " " : (receipt.paidBy === 1) ? receipt.chequeNo : (receipt.paidBy === 2) ? receipt.ddNo : " ",
								receipt.bankName,
								receipt.bankBranch,
								(receipt.payment === 0) ? "Part" : "Full",
								(receipt.receivedAt) ? receipt.receivedAt : "Not yet received",
								receipt.cpList.sort((a, b) => b.createdAt - a.createdAt).map(cp => `${cp.cpName} | ${cp.cpNumber} | ${cp.cpEmail || ""} | ${moment(cp.createdAt).format("DD-MM-YYYY HH:mm")}`).reduce((acc, curr) => `${acc}\n${curr}`)
							]);
							worksheet.getRow(receiptsStartIndex).height = 30;
							worksheet.getRow(receiptsStartIndex).style.font = normalText;
						});

						worksheet.addRow([]);
						worksheet.addRow(["SI No.", "Date", "Other Task", "Remarks"]);
						let otherStartIndex = receiptsStartIndex + 2;

						worksheet.getRow(otherStartIndex).style.font = boldTextProps;
						worksheet.mergeCells(`D${otherStartIndex}:F${otherStartIndex}`);

						const otherTasks = exec.otherTasks.sort((a, b) => b.createdAt - a.createdAt);

						otherTasks.forEach((otherTask, otherIndex) => {
							otherStartIndex++;
							worksheet.addRow([++otherIndex, otherTask.date, otherTask.subject, otherTask.remarks]);
							worksheet.getRow(otherStartIndex).style.font = normalText;
							worksheet.mergeCells(`D${otherStartIndex}:F${otherStartIndex}`);
						});

					});

					const tempFunc = async () => {
						await workbook.xlsx.writeFile(`/tmp/${fileName}`);
						this.added("receipts", "workReportsExcel", { fileName });
						console.log("data publication for \"reports.getWorkReports is complete.\"");
						this.ready();
					};

					tempFunc.apply(this);
				} else if(format === "pdf") {
					const fonts = {
					  	Helvetica: {
						    normal: 'Helvetica',
						    bold: 'Helvetica-Bold',
						    italics: 'Helvetica-Oblique',
						    bolditalics: 'Helvetica-BoldOblique'
					  	},
					};

					const tableLayout = {
				    	hLineWidth: function (i, node) {
							return ((i === 0 || i === 1) || i === node.table.body.length) ? 2 : 1;
						},
						vLineWidth: function (i, node) {
							return (i === 0 || i === node.table.widths.length) ? 2 : 1;
						},
						hLineColor: function (i, node) {
							return ((i === 0 || i === 1) || i === node.table.body.length) ? 'black' : 'gray';
						},
						vLineColor: function (i, node) {
							return (i === 0 || i === node.table.widths.length) ? 'black' : 'gray';
						},
				  	};

					let content = [];
					docs.forEach((exec, execIndex) => {
						const name = `Name: ${exec.execName}`;
						let visitsTableData = {
					  		headerRows: 1,
					  		widths: [ 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto' ],
				        	body: [
				        		[ 
				          			{ text: 'SI No', style: 'tableHeader', bold: true }, 
				          			{ text: 'Date', style: 'tableHeader', bold: true }, 
				          			{ text: 'Visited Party', style: 'tableHeader', bold: true }, 
				          			{ text: 'Party Code', style: 'tableHeader', bold: true }, 
				          			{ text: 'Contact Person', style: 'tableHeader', bold: true }, 
				          			{ text: 'Reason', style: 'tableHeader', bold: true }, 
				          			{ text: 'Remarks', style: 'tableHeader', bold: true } 
				          		]
				        	]
					  	};

					  	const visitedTasks = exec.visitedTasks.sort((a, b) => b.createdAt - a.createdAt);
					  	visitedTasks.forEach((visitedTask, visitIndex) => {
							visitsTableData.body.push([++visitIndex, visitedTask.date, `${visitedTask.partyName}\n${visitedTask.partyAddress}`, visitedTask.partyCode, `${visitedTask.cpName}\n(${visitedTask.cpNumber})`, getReasonFromCode(visitedTask.reason), (visitedTask.remarks || "")]);
					  	});

					  	let receiptsTableData = {
					  		headerRows: 1,
					  		widths: [ 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto' ],
				        	body: [
				        		[ 
				          			{ text: 'SI No', style: 'tableHeader', bold: true }, 
				          			{ text: 'Date', style: 'tableHeader', bold: true }, 
				          			{ text: 'Receipt to Party', style: 'tableHeader', bold: true }, 
				          			{ text: 'Party Code', style: 'tableHeader', bold: true }, 
				          			{ text: 'Receipt No.', style: 'tableHeader', bold: true }, 
				          			{ text: 'Paid Amt.', style: 'tableHeader', bold: true }, 
				          			{ text: 'Payment By', style: 'tableHeader', bold: true }, 
				          			{ text: 'DD/Cheque No.', style: 'tableHeader', bold: true }, 
				          			{ text: 'Bank', style: 'tableHeader', bold: true }, 
				          			{ text: 'Branch', style: 'tableHeader', bold: true }, 
				          			{ text: 'Payment', style: 'tableHeader', bold: true }, 
				          			{ text: 'Received At', style: 'tableHeader', bold: true }, 
				          			{ text: 'Sent To', style: 'tableHeader', bold: true } 
				          		]
				        	]
					  	};

					  	const receipts = exec.receipts.sort((a, b) => b.createdAt - a.createdAt);
					  	receipts.forEach((receipt, receiptIndex) => {
							receiptsTableData.body.push([
								{ text: ++receiptIndex, fontSize: 10 }, 
								{ text: receipt.date, fontSize: 10 }, 
								{ text: `${receipt.partyDetails.name}\n${receipt.partyDetails.address}`, fontSize: 10 }, 
								{ text: receipt.partyDetails.partyCode, fontSize: 10 }, 
								{ text: receipt.receiptNo, fontSize: 10 }, 
								{ text: receipt.amount, fontSize: 10 }, 
								{ text: (receipt.paidBy === 0) ? "Cash" : (receipt.paidBy === 1) ? "Cheque" : (receipt.paidBy === 2) ? "Demand Draft" : " ", fontSize: 10 }, 
								{ text: (receipt.paidBy === 0) ? " " : (receipt.paidBy === 1) ? receipt.chequeNo : (receipt.paidBy === 2) ? receipt.ddNo : " ", fontSize: 10 }, 
								{ text: receipt.bankName || " ", fontSize: 10 }, 
								{ text: receipt.bankBranch || " ", fontSize: 10 }, 
								{ text: (receipt.payment === 0) ? "Part" : "Full", fontSize: 10 }, 
								{ text: (receipt.receivedAt) ? receipt.receivedAt : "Not Yet Received", fontSize: 10 },
								{ text: receipt.cpList.sort((a, b) => b.createdAt - a.createdAt).map(cp => `${cp.cpName} | ${cp.cpNumber} | ${cp.cpEmail || ""} | ${moment(cp.createdAt).format("DD-MM-YYYY HH:mm")}`).reduce((acc, curr) => `${acc}\n${curr}`), fontSize: 10 } 
								
							]);
					  	});

					  	// console.log("receiptsTableData: " + JSON.stringify(receiptsTableData));

					  	let otherTableData = {
					  		headerRows: 1,
					  		widths: [ 'auto', 'auto', 'auto', 'auto' ],
				        	body: [
				        		[ 
				          			{ text: 'SI No', style: 'tableHeader', bold: true }, 
				          			{ text: 'Date', style: 'tableHeader', bold: true }, 
				          			{ text: 'Subject', style: 'tableHeader', bold: true }, 
				          			{ text: 'Remarks', style: 'tableHeader', bold: true }, 
				          		]
				        	]
					  	};

					  	const otherTasks = exec.otherTasks.sort((a, b) => b.createdAt - a.createdAt);
					  	otherTasks.forEach((otherTask, otherIndex) => {
							otherTableData.body.push([++otherIndex, otherTask.date, (otherTask.subject || ""), (otherTask.remarks || "")]);
					  	});

					  	if(execIndex !== 0) {
					  		content.push({ text: " " });
					  	}

						content.push({ text: name, fontSize: 18, bold: true });

						if(exec.visitedTasks.length !== 0) {
							content.push({ text: "Visits", fontSize: 12, bold: true });
							content.push({ layout: tableLayout, table: visitsTableData });
						}

						if(exec.receipts.length !== 0) {
							content.push({ text: " " });
							content.push({ text: "Receipts", fontSize: 12, bold: true });
							content.push({ layout: tableLayout, table: receiptsTableData });
						}

						if(exec.otherTasks.length !== 0) {
							content.push({ text: " " });
							content.push({ text: "Other Tasks", fontSize: 12, bold: true });
							content.push({ layout: tableLayout, table: otherTableData });
						}
					});

					// console.log("content: " + JSON.stringify(content));

					const docDefinition = {
						pageSize: 'A4',
						pageOrientation: 'landscape',
						content,
						defaultStyle: {
						    font: 'Helvetica'
						},
						pageMargins: [ 10, 30, 10, 30 ],
					};

					const pdfDoc = (new PdfMake(fonts)).createPdfKitDocument(docDefinition);
					
					pdfDoc.pipe(fs.createWriteStream(`/tmp/${fileName}`));
					pdfDoc.end();

					this.added("receipts", "workReportsPdf", { fileName });
					console.log("data publication for \"reports.getWorkReports is complete.\"");
					this.ready();
				}

			}).catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			this.onStop(() => {
				this.stop();
				console.log("Publication, \"reports.getWorkReports\" is stopped.");
			});
		} else {
			this.ready();
		}
	});

	Meteor.publish('reports.getAttendanceReports', function({format, from, to}){
		console.log("Publishing the reports.getAttendanceReports...");
		console.log("reports.getAttendanceReports method with format: " + format + ", from: " + from + ", to: " + to);

		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			const execIds = Meteor.roleAssignment.find({"role._id": "executive"}).map(roleObj => roleObj.user._id);
			const currentExecutives = Meteor.users.find({ _id: { $in: execIds } }).fetch();
			const fileName = `${Random.hexString(10)}.${(format === "excel") ? "xls" : "pdf"}`;

			let fromMoment = moment(from);
			let endMoment = moment(to);

			let datesArr = [];
			do {
				datesArr.push({
					createdAt: { 
                        $gte: new Date(fromMoment.format(`YYYY-MM-DDT${DUTY_START_TIME}:00`)),
                        $lte: new Date(fromMoment.format(`YYYY-MM-DDT${DUTY_END_TIME}:00`))
                    }
				});
				fromMoment.add(1, "days");
			} while(fromMoment.unix() < endMoment.unix())

			console.log("datesArr: " + JSON.stringify(datesArr));

			const asyncWrapper = async () => {
				const getData = (resolve, reject) => {
					Collections.locations.rawCollection().aggregate([
						{
					        $match: {
					            $or: [...datesArr]					//We want his presence only in duty time and not in any other time.
					        }
					    },
					    {
					        $sort: {
					            createdAt: 1
					        }
					    },
					    {
					        $group: {
					            _id: "$sessionId",
					            firstCreatedAt: { $first: "$createdAt" },
					            lastCreatedAt: { $last: "$createdAt" },
					            createdAt: { $last: "$createdAt" },
					            userId: { $first: "$userId" }
					        }
					    },
					    {
					        $project: {
					            _id: 1,
					            period: { $subtract: ["$lastCreatedAt", "$firstCreatedAt"] },
					            createdAt: 1,
					            date: { $dateToString: { date: "$createdAt", format: "%d-%m-%Y", timezone: "Asia/Kolkata" } },
					            userId: 1
					        }
					    },
					    {
					        $sort: { createdAt: 1 }
					    },
					    {
					        $group: {
					            _id: { $concat: ["$date", "$userId"] },
					            createdAt: { $last: "$createdAt" },
					            userId: { $first: "$userId" },
					            timePeriod: { $sum: "$period" },
					            date: { $first: "$date" },
					        }
					    },
					    {
					        $group: {
					            _id: "$userId",
					            dates: { 
					                $addToSet: {
					                    date: "$date",
					                    createdAt: { $toLong: "$createdAt" },
					                    timePeriod: "$timePeriod"
					                }
					            }
					        }
					    },
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);
							// console.log("docs: " + JSON.stringify(docs));

							resolve.apply(this, [docs]);
						}).bind(this));
					}).bind(this));
				};

				const prmse = new Promise(getData.bind(this));

				const attendances = await prmse;

				let executivesAttendances = [ ["Name\\Date"].concat(datesArr.map(date => moment(date.createdAt.$gte).format("DD-MM-YY"))) ];
				currentExecutives.forEach((exec, execIndex) => {
					const userFound = attendances.find(elem => elem._id === exec._id) || { dates: [] };
					// console.log("userFound: " + JSON.stringify(userFound));

					executivesAttendances.push([exec.profile.name].concat(datesArr.map(date => {
						const dateString = moment(date.createdAt.$gte).format("DD-MM-YYYY");
						const dateFound = userFound.dates.find(d => dateString === d.date)
						if(dateFound) {
							return `${moment.duration(dateFound.timePeriod).hours()} Hrs ${moment.duration(dateFound.timePeriod).minutes()} Mins`;
						} else {
							return "A";
						}
					})) );

				});

				// console.log("executivesAttendances: " + JSON.stringify(executivesAttendances));

				if(format === "excel") {
					let workbook = new ExcelJS.Workbook();
					workbook.creator = 'PBD Executives reports dashboard';
					workbook.created = new Date();
					const normalText = { name: 'Calibri', family: 2, size: 10, scheme: 'minor' };
					const boldTextProps = { name: 'Calibri', family: 2, size: 10, scheme: 'minor', bold: true };
					
					let worksheet = workbook.addWorksheet("Attendances", {
										pageSetup:{
											paperSize: 9, 
											orientation:'landscape'
										}
									});
					worksheet.addRow([`Note: Attendance is calculated based on location data between ${DUTY_START_TIME} to ${DUTY_END_TIME} for the period ${fromMoment.format("DD-MM-YYYY")} to ${endMoment.format("DD-MM-YYYY")}`]);
					worksheet.addRow([" "]);

					executivesAttendances[0].forEach((item, itemIndex) => {
						if(itemIndex === 0) {
							worksheet.getColumn(++itemIndex).width = 30;
						} else {
							worksheet.getColumn(++itemIndex).width = 13;
						}
					});

					executivesAttendances.forEach((items, itemIndex) => {
						worksheet.addRow(items);
						worksheet.getRow(itemIndex + 2).style.font = normalText;
					});

					worksheet.getRow(3).style.font = boldTextProps;

					const tempFunc = async () => {
						await workbook.xlsx.writeFile(`/tmp/${fileName}`);
						this.added("receipts", "attendanceReportsExcel", { fileName });
						console.log("data publication for \"reports.getAttendanceReports is complete.\"");

						this.ready();
					};

					tempFunc.apply(this);
				} else if(format === "pdf") {
					const fonts = {
					  	Helvetica: {
						    normal: 'Helvetica',
						    bold: 'Helvetica-Bold',
						    italics: 'Helvetica-Oblique',
						    bolditalics: 'Helvetica-BoldOblique'
					  	},
					};

					const tableLayout = {
				    	hLineWidth: function (i, node) {
							return ((i === 0 || i === 1) || i === node.table.body.length) ? 2 : 1;
						},
						vLineWidth: function (i, node) {
							return (i === 0 || i === node.table.widths.length) ? 2 : 1;
						},
						hLineColor: function (i, node) {
							return ((i === 0 || i === 1) || i === node.table.body.length) ? 'black' : 'gray';
						},
						vLineColor: function (i, node) {
							return (i === 0 || i === node.table.widths.length) ? 'black' : 'gray';
						},
				  	};

				  	let content = [
				  		{ "text": `Note: Attendance is calculated based on location data between ${DUTY_START_TIME} to ${DUTY_END_TIME} for the period ${fromMoment.format("DD-MM-YYYY")} to ${endMoment.format("DD-MM-YYYY")}`, fontSize: 12 },
				  		{ "text": " " }
				  	];

					executivesAttendances.forEach((items, itemsIndex) => {
						if(itemsIndex === 0) return;

						content.push({ text: items[0], fontSize: 14, bold: true });
						let tableData = {
							layout: tableLayout, 
							table: {
						  		headerRows: 1,
						  		widths: ["auto", "auto"],
					        	body: [
					        		[
						        		{ text: "Date", style: 'tableHeader', bold: true },
						        		{ text: "Duration", style: 'tableHeader', bold: true }
					        		]
					        	]
						  	}
						};

						console.log("items: " + JSON.stringify(items));
						
						items.forEach((item, itemIndex) => {
							if(itemIndex === 0) return;

							tableData.table.body.push([executivesAttendances[0][itemIndex], item]);
						});

						content.push(tableData);
						content.push({ text: " " });
					});

					console.log("content: " + JSON.stringify(content));

					const docDefinition = {
						pageSize: 'A4',
						pageOrientation: 'landscape',
						content,
						defaultStyle: {
						    font: 'Helvetica'
						}
					};

					const pdfDoc = (new PdfMake(fonts)).createPdfKitDocument(docDefinition);
					
					pdfDoc.pipe(fs.createWriteStream(`/tmp/${fileName}`));
					pdfDoc.end();

					this.added("receipts", "attendanceReportsPdf", { fileName });
					console.log("data publication for \"reports.getWorkReports is complete.\"");
					this.ready();
				}
			};

			asyncWrapper.apply(this);
			this.onStop(() => {
				this.stop();
				console.log("Publication, \"reports.getAttendanceReports\" is stopped.");
			});
		} else {
			this.ready();
		}
	});
}


if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import $ from 'jquery';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faCircleNotch, faCompactDisc, faFileExcel, faFilePdf } from '@fortawesome/free-solid-svg-icons';
	import { datepicker } from 'jquery-ui-dist/jquery-ui.min.js';
	import PieChart from './PieChart';
	import BarChart from './BarChart';
	import LineChart from './LineChart';
	import { Tracker } from 'meteor/tracker';

	const ReportsBlock = (props) => {
		const [fromDate, setFromDate] = useState(moment().format("DD-MMM-YYYY"));
		const [toDate, setToDate] = useState(moment().format("DD-MMM-YYYY"));

		const initializeFromDatepicker = (maxDate) => {
			$(`#${props.id}FromDate`).datepicker({
			    dateFormat: "dd-M-yy",
			    maxDate,
			    onSelect: (dateText, dateInst) => {
			    	setFromDate(dateText);
			    	$(`#${props.id}toDate`).datepicker("destroy");
			    	initializeToDatepicker(dateText);
			    	if(props.onFromDateSelect) {
			    		props.onFromDateSelect(moment(dateText, "DD-MMM-YYYY").startOf("day").toDate());
			    	}
			    }
			});
		};

		const initializeToDatepicker = (minDate) => {
			$(`#${props.id}toDate`).datepicker({
			    dateFormat: "dd-M-yy",
			    maxDate: new Date(),
			    minDate,
			    onSelect: (dateText, dateInst) => {
			    	setToDate(dateText);
			    	$(`#${props.id}FromDate`).datepicker("destroy");
			    	initializeFromDatepicker(dateText);

			    	if(props.onToDateSelect) {
			    		props.onToDateSelect(moment(dateText, "DD-MMM-YYYY").endOf("day").toDate());
			    	}
			    }
			});
		};

		const initializeDatePicker = () => {
			initializeFromDatepicker(fromDate);
			initializeToDatepicker(toDate);
		};

		const generateReport = (event) => {
			event.preventDefault();

			if(props.onGenerate) {
				props.onGenerate(moment(fromDate, "DD-MMM-YYYY").startOf("day"), moment(toDate, "DD-MMM-YYYY").endOf("day"));
			}
		}

		useEffect(() => {
			initializeDatePicker();

			return (() => {
				$(`#${props.id}FromDate`).datepicker("destroy");
				$(`#${props.id}toDate`).datepicker("destroy");
			});
		}, []);

		return <div className="reports-container">
			<div className="text-center"><h3>{props.title}</h3></div>
			<div className="text-center">
				<form onSubmit={generateReport}>
					{props.fromString}
					<input id={`${props.id}FromDate`} type="text" value={fromDate}/> 
					&nbsp; &nbsp; 
					{props.toString} 
					<input id={`${props.id}toDate`} type="text" value={toDate}/>
					&nbsp; &nbsp;
					{
						props.onGenerate ? 
						<button className="btn btn-sm btn-primary" type="submit"> Generate </button> :
						null
					}
				</form>
			</div>

			<div className="">
				{props.children}
			</div>
		</div>
	};

	const Reports = (props) => {
		let todayStart = moment().startOf("day").toDate();
		let todayEnd = moment().endOf("day").toDate();

		const [collectionsPieLoading, setCollectionsPieLoading] = useState(true);
		const [collectionsLineLoading, setCollectionsLineLoading] = useState(true);
		const [collectionsPieData, setCollectionsPieData] = useState([]);
		const [collectionsLineData, setCollectionsLineData] = useState([]);
		const [pieWidth, setPieWidth] = useState(null);
		const [lineWidth, setLineWidth] = useState(null);
		const [collectionsFrom, setCollectionsFrom] = useState(todayStart);
		const [collectionsTo, setCollectionsTo] = useState(todayEnd);

		const [efficiencyLoading, setEfficiencyLoading] = useState(true);
		const [efficiencyBarData, setEfficiencyBarData] = useState([]);
		const [barWidth, setBarWidth] = useState(null);
		const [efficiencyFrom, setEfficiencyFrom] = useState(todayStart);
		const [efficiencyTo, setEfficiencyTo] = useState(todayEnd);

		const [workReportFrom, setWorkReportFrom] = useState(todayStart);
		const [workReportTo, setWorkReportTo] = useState(todayEnd);
		const [generatingWorkReportExcel, setGeneratingWorkReportExcel] = useState(false);
		const [generatingWorkReportPdf, setGeneratingWorkReportPdf] = useState(false);

		const [attendanceReportFrom, setAttendanceReportFrom] = useState(todayStart);
		const [attendanceReportTo, setAttendanceReportTo] = useState(todayEnd);
		const [generatingAttendanceReportExcel, setGeneratingAttendanceReportExcel] = useState(false);
		const [generatingAttendanceReportPdf, setGeneratingAttendanceReportPdf] = useState(false);

		const getCollections = (from, to) => {
			setCollectionsPieLoading(true);
			setCollectionsLineLoading(true);

			setCollectionsFrom(from.toDate());
			setCollectionsTo(to.toDate());
		};

		const getEfficiencies = (from, to) => {
			setEfficiencyLoading(true);

			setEfficiencyFrom(from.toDate());
			setEfficiencyTo(to.toDate());
		};

		const getWorkReports = (format) => {
			let generatingFlag;
			(format === "excel") ? 
				(generatingFlag = setGeneratingWorkReportExcel) : 
				(generatingFlag = setGeneratingWorkReportPdf);

			generatingFlag(true);

			const handle = Meteor.subscribe('reports.getWorkReports', { format,  from: workReportFrom, to: workReportTo }, {
				onStop(error) {
					console.log("reports.getWorkReports is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("reports.getWorkReports is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const fileName = Collections.receipts.findOne({ _id: (format === "excel") ? "workReportsExcel" : "workReportsPdf" }).fileName;
					fetch(`/api/downloadFile/${fileName}`)
						.then(resp => resp.blob())
						.then(blob => {
					   		const url = window.URL.createObjectURL(blob);
						    const a = document.createElement('a');
						    a.style.display = 'none';
						    a.href = url;
						    // the filename you want
						    a.download = `work_report_${moment(workReportFrom).format("DDMMMYY")}-${moment(workReportTo).format("DDMMMYY")}.${(format === "excel") ? "xls" : "pdf"}`;
						    document.body.appendChild(a);
						    a.click();
						    window.URL.revokeObjectURL(url);
						    a.remove();
						    // alert('your file has downloaded!'); // or you know, something with better UX...
						    generatingFlag(false);
						    handle.stop();
					  	})
					  	.catch(err => {
					  		alert('Error!' + err);
					  		generatingFlag(false);
					  	});
				}
			});
		};

		const getAttendanceReports = (format) => {
			let generatingFlag;
			(format === "excel") ? 
				(generatingFlag = setGeneratingAttendanceReportExcel) : 
				(generatingFlag = setGeneratingAttendanceReportPdf);

			generatingFlag(true);

			const handle = Meteor.subscribe('reports.getAttendanceReports', { format,  from: attendanceReportFrom, to: attendanceReportTo }, {
				onStop(error) {
					console.log("reports.getAttendanceReports is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("reports.getAttendanceReports is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const fileName = Collections.receipts.findOne({ _id: (format === "excel") ? "attendanceReportsExcel" : "attendanceReportsPdf" }).fileName;
					fetch(`/api/downloadFile/${fileName}`)
						.then(resp => resp.blob())
						.then(blob => {
					   		const url = window.URL.createObjectURL(blob);
						    const a = document.createElement('a');
						    a.style.display = 'none';
						    a.href = url;
						    // the filename you want
						    a.download = `attendance_report_${moment(attendanceReportFrom).format("DDMMMYY")}-${moment(attendanceReportTo).format("DDMMMYY")}.${(format === "excel") ? "xls" : "pdf"}`;
						    document.body.appendChild(a);
						    a.click();
						    window.URL.revokeObjectURL(url);
						    a.remove();
						    // alert('your file has downloaded!'); // or you know, something with better UX...
						    generatingFlag(false);
						    handle.stop();
					  	})
					  	.catch(err => {
					  		alert('Error!' + err);
					  		generatingFlag(false);
					  	});
				}
			});			
		}

		useEffect(() => {
			const containerWidth = $('.tabs-content-container').width();
			const piewdth = parseInt(containerWidth * 0.4);
			const linewdth = parseInt(containerWidth * 0.8);
			setPieWidth(piewdth);
			setLineWidth(linewdth);

			const barwdth = parseInt(containerWidth * 0.8);
			setBarWidth(barwdth);

		}, [pieWidth, lineWidth]);

		//update the pieChart and lineChart
		useEffect(() => {
			const handle = Meteor.subscribe('reports.getCollections', { from: collectionsFrom, to: collectionsTo }, {
				onStop(error) {
					console.log("reports.getCollections is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("reports.getCollections is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const collectionsPie = Collections.receipts.findOne({ "_id": "collectionsPie" });
					
					if(collectionsPie && collectionsPie.docs) {
						let pieData = [];
						collectionsPie.docs.forEach(doc => {
							pieData.push({ name: doc.name, value: doc.amount });
						});

						setCollectionsPieData(pieData);
						setCollectionsPieLoading(false);
					}

					const collectionsLine = Collections.receipts.findOne({ "_id": "collectionsLine" });

					if(collectionsLine && collectionsLine.docs) {
						let lineData = [];
						collectionsLine.docs.forEach(doc => {
							lineData.push({ date: doc.createdAt, value: doc.amount });
						});

						setCollectionsLineData(lineData);
						setCollectionsLineLoading(false);
					}

				}
			})

			return function() {
				handle.stop();
			}
		}, [collectionsFrom, collectionsTo]);

		//update the barChart
		useEffect(() => {
			const handle = Meteor.subscribe('reports.getEfficiencies', { from: efficiencyFrom, to: efficiencyTo }, {
				onStop(error) {
					console.log("reports.getEfficiencies is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("reports.getEfficiencies is ready to get the data.");
				}
			});

			Tracker.autorun(() => {
				if(handle.ready()) {
					const efficienciesBar = Collections.receipts.findOne({ "_id": "efficienciesBar" });
					
					if(efficienciesBar && efficienciesBar.docs) {
						let barData = [];
						console.log("efficienciesBar: " + JSON.stringify(efficienciesBar));
						efficienciesBar.docs.forEach(doc => {
							barData.push({ name: doc.name, value: doc.average });
						});

						setEfficiencyBarData(barData);
						setEfficiencyLoading(false);
					}
				}
			})

			return function() {
				handle.stop();
			}
		}, [efficiencyFrom, efficiencyTo]);

		return <div>
			<ReportsBlock 	id="collectionsBlock" 
							title="Collections" 
							fromString="Filter results from: " 
							toString="To: " 
							onGenerate={getCollections}>
				{ 
					<React.Fragment>
						<div className="text-center">
							<div style={{ width: `${pieWidth}px`, margin: "20px", display: "inline-block"}}>
								{
									(collectionsPieLoading || !pieWidth) ? 

									<div><FontAwesomeIcon icon={faCircleNotch} spin/> Loading...</div> :

									(collectionsPieData.length) ?

									<PieChart 	id="collectionsPie" width={pieWidth} height={pieWidth} data={collectionsPieData}/>

									: <div className="text-danger">No data present for this time period</div>
								}
							</div>
						</div>
						<br/>
						<div style={{margin: "20px"}}>
							{
								(collectionsLineLoading || !lineWidth) ? 

								<div className="text-center"><FontAwesomeIcon icon={faCircleNotch} spin/> Loading...</div> :
								
								(collectionsLineData.length) ?

								<React.Fragment>
									<LineChart id="collectionsLine" width={lineWidth} height={lineWidth/2} data={collectionsLineData}/>

									<div className="text-center">
										<h5>Total Collections: 
											<b>₹{(collectionsPieData.reduce((accumulator, currObj) => (accumulator + currObj.value), 0) + 0.00001).toString().match(/[0-9]+\.[0-9][0-9]/)[0]}</b>
										</h5>
									</div>
								</React.Fragment>

								: <div className="text-center text-danger">No data present for this time period</div>
							}
						</div>
						<br/>
					</React.Fragment>
				}
			</ReportsBlock>
			<br/>
			<ReportsBlock 	id="efficienciesBlock" 
							title="Efficiency" 
							fromString="Filter results from: " 
							toString="To: " 
							onGenerate={getEfficiencies}>
				{
					(efficiencyLoading || !barWidth) ? 

					<div className="text-center"><FontAwesomeIcon icon={faCircleNotch} spin/> Loading...</div> :

					(efficiencyBarData.length) ? 

					<React.Fragment>
						<div style={{ transform: "rotate(-90deg)", display: "inline-block", float: "left", marginTop: `${barWidth * 0.2}px`}}>
							Rupees / Day
						</div>
						<div style={{ width: `${barWidth}px`, display: "inline-block", float: "left"}}>
							<BarChart 	id="efficienciesBar" width={barWidth} height={barWidth * 0.5}
										data={efficiencyBarData}/>
						</div>
						<div style={{"clear": "both"}}></div>
						<br/>
						<div className="text-center">
							<h5>Average efficiency: 
								<b>₹{efficiencyBarData.reduce((accumulator, currObj) => (parseFloat(accumulator + currObj.value).toFixed(2)), 0)}/day</b>
							</h5>
						</div>
					</React.Fragment>

					: <div className="text-center text-danger" style={{margin: "20px"}}>No data present for this time period</div>
				}
			</ReportsBlock>
			<br/>
			<ReportsBlock 	id="workReportBlock" 
							title="Work Report" 
							fromString="Get work report from: " 
							toString="To: " 
							onFromDateSelect={fromDate => setWorkReportFrom(fromDate)}
							onToDateSelect={toDate => setWorkReportTo(toDate)}>
				<br/>
				<div className="text-center">
					<button className="btn btn-success" 
							onClick={getWorkReports.bind(this, "excel")}
							disabled={generatingWorkReportExcel}>
						{
							generatingWorkReportExcel ? 
							<div className="text-center">
								<FontAwesomeIcon icon={faCompactDisc} spin/> generating...
							</div>
							:
							<React.Fragment>
								Export to Excel &nbsp;<FontAwesomeIcon icon={faFileExcel}/>
							</React.Fragment>
						}
					</button> &nbsp; &nbsp; &nbsp;
					<button className="btn btn-danger" 
							onClick={getWorkReports.bind(this, "pdf")}
							disabled={generatingWorkReportPdf}>
						{
							generatingWorkReportPdf ? 
							<div className="text-center">
								<FontAwesomeIcon icon={faCompactDisc} spin/> generating...
							</div>
							:
							<React.Fragment>
								Export to PDF &nbsp;<FontAwesomeIcon icon={faFilePdf}/>
							</React.Fragment>
						}
					</button>
				</div>
			</ReportsBlock>
			<br/>
			<ReportsBlock 	id="attendanceReportBlock" 
							title="Attendance Report" 
							fromString="Get Attendance report from: " 
							toString="To: " 
							onFromDateSelect={fromDate => setAttendanceReportFrom(fromDate)}
							onToDateSelect={toDate => setAttendanceReportTo(toDate)}>
				<br/>
				<div className="text-center">
					<button className="btn btn-success" 
							onClick={getAttendanceReports.bind(this, "excel")}
							disabled={generatingAttendanceReportExcel}>
						{
							generatingAttendanceReportExcel ? 
							<div className="text-center">
								<FontAwesomeIcon icon={faCompactDisc} spin/> generating...
							</div>
							:
							<React.Fragment>
								Export to Excel &nbsp;<FontAwesomeIcon icon={faFileExcel}/>
							</React.Fragment>
						}
					</button> &nbsp; &nbsp; &nbsp;
					<button className="btn btn-danger" 
							onClick={getAttendanceReports.bind(this, "pdf")}
							disabled={generatingAttendanceReportPdf}>
						{
							generatingAttendanceReportPdf ? 
							<div className="text-center">
								<FontAwesomeIcon icon={faCompactDisc} spin/> generating...
							</div>
							:
							<React.Fragment>
								Export to PDF &nbsp;<FontAwesomeIcon icon={faFilePdf}/>
							</React.Fragment>
						}
					</button>
				</div>
			</ReportsBlock>
		</div>
	}

	export default Reports;
}