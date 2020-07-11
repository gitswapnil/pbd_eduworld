import React, { useState, useEffect } from 'react';
import $ from 'jquery';
import { datepicker } from 'jquery-ui-dist/jquery-ui.min.js';
import PieChart from './PieChart';
import BarChart from './BarChart';
import LineChart from './LineChart';

const ReportsBlock = (props) => {
	const [fromDate, setFromDate] = useState(moment().format("DD-MMM-YYYY"));
	const [toDate, setToDate] = useState(moment().format("DD-MMM-YYYY"));

	const initializeFromDatepicker = (maxDate) => {
		$(this.fromDate).datepicker({
		    dateFormat: "dd-M-yy",
		    maxDate,
		    onSelect: (dateText, dateInst) => {
		    	setFromDate(dateText);
		    	$(this.toDate).datepicker("destroy");
		    	initializeToDatepicker(dateText);
		    }
		});
	};

	const initializeToDatepicker = (minDate) => {
		$(this.toDate).datepicker({
		    dateFormat: "dd-M-yy",
		    maxDate: new Date(),
		    minDate,
		    onSelect: (dateText, dateInst) => {
		    	setToDate(dateText);
		    	$(this.fromDate).datepicker("destroy");
		    	initializeFromDatepicker(dateText);
		    }
		});
	};

	const initializeDatePicker = () => {
		initializeFromDatepicker(fromDate);
		initializeToDatepicker(null);
	};

	const generateReport = (event) => {
		event.preventDefault();
		props.onGenerate(moment(fromDate, "DD-MMM-YYYY").startOf("day"), moment(toDate, "DD-MMM-YYYY").endOf("day"));
	}

	useEffect(() => {
		initializeDatePicker();

		return (() => {
			$(this.fromDate).datepicker("destroy");
			$(this.toDate).datepicker("destroy");
		});
	}, []);

	return <div className="reports-container">
		<div className="text-center"><h3>{props.title}</h3></div>
		<div className="text-center">
			<form onSubmit={generateReport}>
				{props.fromString}
				<input type="text" ref={ref => this.fromDate = ref} value={fromDate}/> 
				&nbsp; &nbsp; 
				{props.toString} 
				<input type="text" ref={ref => this.toDate = ref} value={toDate}/>
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
	const [collectionsLoading, setCollectionsLoading] = useState(true);
	const [pieWidth, setPieWidth] = useState(null);
	const [lineWidth, setLineWidth] = useState(null);

	const [efficiencyLoading, setEfficiencyLoading] = useState(true);
	const [barWidth, setBarWidth] = useState(null);

	const getCollections = (from, to) => {
		console.log("from: " + from.toDate());
		console.log("to: " + to.toDate());
	}

	const getEfficiencies = (from, to) => {
		console.log("from: " + from.toDate());
		console.log("to: " + to.toDate());
	}

	useEffect(() => {
		const containerWidth = $('.tabs-content-container').width();
		const piewdth = parseInt(containerWidth * 0.5);
		const linewdth = parseInt(containerWidth * 0.8);
		setPieWidth(piewdth);
		setLineWidth(linewdth);

		const barwdth = parseInt(containerWidth * 0.8);
		setBarWidth(barwdth);

		setCollectionsLoading(false);
		setEfficiencyLoading(false);
	}, [pieWidth, lineWidth, collectionsLoading]);
	

	return <div>
		<ReportsBlock title="Collections" fromString="Filter results from: " toString="To: " onGenerate={getCollections}>
			{ 
				<React.Fragment>
					<div className="text-center">
						<div style={{ width: `${pieWidth}px`, margin: "20px", display: "inline-block"}}>
							{
								(collectionsLoading || !pieWidth) ? "Loading" :

								<PieChart 	id="collectionsPie" width={pieWidth} height={pieWidth}
											data={[
													{ name: "Sanjay", value: 56423.01 }, 
												  	{ name: "Nelson", value: 12302 },
												  	{ name: "Umesh", value: 65923 },
												  	{ name: "Suresh", value: 89956 },
												  	{ name: "exec1", value: 123456 },
												  	{ name: "exec2", value: 54234 },
												  	{ name: "exec3", value: 23546 },
												  	{ name: "exec4", value: 25876 },
												  	{ name: "exec5", value: 86754 },
												]}/>
							}
						</div>
					</div>
					<br/>
					<div style={{margin: "20px"}}>
						{
							(collectionsLoading || !lineWidth) ? "Loading" :
							<LineChart id="collectionsLine" width={lineWidth} height={lineWidth/2}
										data={[
												{"date":new Date("2007-04-23T00:00:00.000Z"),"value":93.24},
												{"date":new Date("2007-04-24T00:00:00.000Z"),"value":95.35},
												{"date":new Date("2007-04-25T00:00:00.000Z"),"value":98.84},
												{"date":new Date("2007-04-26T00:00:00.000Z"),"value":99.92},
												{"date":new Date("2007-04-29T00:00:00.000Z"),"value":99.8},
												{"date":new Date("2007-05-01T00:00:00.000Z"),"value":99.47},
												{"date":new Date("2007-05-02T00:00:00.000Z"),"value":100.39},
												{"date":new Date("2007-05-03T00:00:00.000Z"),"value":100.4},
												{"date":new Date("2007-05-04T00:00:00.000Z"),"value":100.81},
												{"date":new Date("2007-05-07T00:00:00.000Z"),"value":103.92},
												{"date":new Date("2007-05-08T00:00:00.000Z"),"value":105.06},
												{"date":new Date("2007-05-09T00:00:00.000Z"),"value":106.88},
												{"date":new Date("2007-05-09T00:00:00.000Z"),"value":107.34},
												{"date":new Date("2007-05-10T00:00:00.000Z"),"value":108.74},
												{"date":new Date("2007-05-13T00:00:00.000Z"),"value":109.36},
												{"date":new Date("2007-05-14T00:00:00.000Z"),"value":107.52},
												{"date":new Date("2007-05-15T00:00:00.000Z"),"value":107.34},
												{"date":new Date("2007-05-16T00:00:00.000Z"),"value":109.44},
												{"date":new Date("2007-05-17T00:00:00.000Z"),"value":110.02},
												{"date":new Date("2007-05-20T00:00:00.000Z"),"value":111.98},
												{"date":new Date("2007-05-21T00:00:00.000Z"),"value":113.54},
												{"date":new Date("2007-05-22T00:00:00.000Z"),"value":112.89},
												{"date":new Date("2007-05-23T00:00:00.000Z"),"value":110.69},
												{"date":new Date("2007-05-24T00:00:00.000Z"),"value":113.62},
												{"date":new Date("2007-05-28T00:00:00.000Z"),"value":114.35},
												{"date":new Date("2007-05-29T00:00:00.000Z"),"value":118.77},
												{"date":new Date("2007-05-30T00:00:00.000Z"),"value":121.19},
												{"date":new Date("2007-06-01T00:00:00.000Z"),"value":118.4},
												{"date":new Date("2007-06-04T00:00:00.000Z"),"value":121.33},
												{"date":new Date("2007-06-05T00:00:00.000Z"),"value":122.67},
												{"date":new Date("2007-06-06T00:00:00.000Z"),"value":123.64},
												{"date":new Date("2007-06-07T00:00:00.000Z"),"value":124.07},
												{"date":new Date("2007-06-08T00:00:00.000Z"),"value":124.49},
												{"date":new Date("2007-06-10T00:00:00.000Z"),"value":120.19},
												{"date":new Date("2007-06-11T00:00:00.000Z"),"value":120.38},
												{"date":new Date("2007-06-12T00:00:00.000Z"),"value":117.5},
												{"date":new Date("2007-06-13T00:00:00.000Z"),"value":118.75},
												{"date":new Date("2007-06-14T00:00:00.000Z"),"value":120.5},
												{"date":new Date("2007-06-17T00:00:00.000Z"),"value":125.09},
												{"date":new Date("2007-06-18T00:00:00.000Z"),"value":123.66},
												{"date":new Date("2007-06-19T00:00:00.000Z"),"value":1215.53},
												{"date":new Date("2007-06-20T00:00:00.000Z"),"value":123.9},
												{"date":new Date("2007-06-21T00:00:00.000Z"),"value":123},
												{"date":new Date("2007-06-24T00:00:00.000Z"),"value":122.34},
												{"date":new Date("2007-06-25T00:00:00.000Z"),"value":119.65},
												{"date":new Date("2007-06-26T00:00:00.000Z"),"value":121.89},
												{"date":new Date("2007-06-27T00:00:00.000Z"),"value":120.56},
												{"date":new Date("2007-06-28T00:00:00.000Z"),"value":122.04},
												{"date":new Date("2007-07-02T00:00:00.000Z"),"value":121.26},
												{"date":new Date("2007-07-03T00:00:00.000Z"),"value":127.17},
												{"date":new Date("2007-07-05T00:00:00.000Z"),"value":132.75},
												{"date":new Date("2007-07-06T00:00:00.000Z"),"value":132.3},
												{"date":new Date("2007-07-09T00:00:00.000Z"),"value":130.33},
												{"date":new Date("2007-07-09T00:00:00.000Z"),"value":132.35},
												{"date":new Date("2007-07-10T00:00:00.000Z"),"value":132.39},
												{"date":new Date("2007-07-11T00:00:00.000Z"),"value":134.07},
											]}/>
						}
					</div>
					<br/>
					<div className="text-center">
						<h5>Total Collections: <b>₹34920</b></h5>
					</div>
				</React.Fragment>
			}
		</ReportsBlock>
		<br/>
		<br/>
		<ReportsBlock title="Efficiency" fromString="Filter results from: " toString="To: " onGenerate={getEfficiencies}>
			{
				efficiencyLoading ? "Loading" : 

				<React.Fragment>
					<div style={{ transform: "rotate(-90deg)", display: "inline-block", float: "left", marginTop: `${barWidth * 0.2}px`}}>
						Rupees / Day
					</div>
					<div style={{ width: `${barWidth}px`, display: "inline-block", float: "left"}}>
						<BarChart 	id="efficienciesBar" width={barWidth} height={barWidth * 0.5}
									data={[
											{ name: "Sanjay", value: 56423.01 }, 
										  	{ name: "Nelson", value: 12302 },
										  	{ name: "Umesh", value: 65923 },
										  	{ name: "Suresh", value: 89956 },
										  	{ name: "exec1", value: 123456 },
										  	{ name: "exec2", value: 54234 },
										  	{ name: "exec3", value: 23546 },
										  	{ name: "exec4", value: 25876 },
										  	{ name: "exec5", value: 86754 },
										]}/>
					</div>
					<div style={{"clear": "both"}}></div>
					<br/>
					<div className="text-center">
						<h5>Average efficiency: <b>₹3490/day</b></h5>
					</div>
				</React.Fragment>
			}
		</ReportsBlock>
	</div>
}

export default Reports;