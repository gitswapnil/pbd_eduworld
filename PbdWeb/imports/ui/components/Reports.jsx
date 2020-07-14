import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';

if(Meteor.isServer) {
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

							console.log("docs: " + JSON.stringify(docs));

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

			const barChartData = getEfficienciesBar.apply(this).then(docs => {
				this.added("receipts", "efficienciesBar", { docs });

				initializing = false;
			}).catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			console.log("data publication for \"reports.getEfficiencies is complete.\"");
			this.ready();
			this.onStop(() => {
				handle1.stop();
				console.log("Publication, \"reports.getEfficiencies\" is stopped.");
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
	import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
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
			    }
			});
		};

		const initializeDatePicker = () => {
			initializeFromDatepicker(fromDate);
			initializeToDatepicker(toDate);
		};

		const generateReport = (event) => {
			event.preventDefault();
			props.onGenerate(moment(fromDate, "DD-MMM-YYYY").startOf("day"), moment(toDate, "DD-MMM-YYYY").endOf("day"));
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
					<button className="btn btn-sm btn-primary" type="submit"> Generate </button>
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

		const getCollections = (from, to) => {
			console.log("from: " + from.toDate());
			console.log("to: " + to.toDate());

			setCollectionsPieLoading(true);
			setCollectionsLineLoading(true);

			setCollectionsFrom(from.toDate());
			setCollectionsTo(to.toDate());
		}

		const getEfficiencies = (from, to) => {
			console.log("from: " + from.toDate());
			console.log("to: " + to.toDate());

			setEfficiencyLoading(true);

			setEfficiencyFrom(from.toDate());
			setEfficiencyTo(to.toDate());
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
			<ReportsBlock id="collectionsBlock" title="Collections" fromString="Filter results from: " toString="To: " onGenerate={getCollections}>
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
											<b>₹{collectionsPieData.reduce((accumulator, currObj) => (parseFloat(accumulator + currObj.value).toFixed(2)), 0)}</b>
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
			<br/>
			<ReportsBlock id="efficienciesBlock" title="Efficiency" fromString="Filter results from: " toString="To: " onGenerate={getEfficiencies}>
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
		</div>
	}

	export default Reports;
}