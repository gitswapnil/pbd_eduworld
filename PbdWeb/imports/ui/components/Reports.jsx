import React, { useState, useEffect } from 'react';
import $ from 'jquery';
import { datepicker } from 'jquery-ui-dist/jquery-ui.min.js';
import PieChart from './PieChart';

const ReportsBlock = (props) => {
	const [fromDate, setFromDate] = useState(moment().format("DD-MMM-YYYY"));
	const [toDate, setToDate] = useState(moment().format("DD-MMM-YYYY"));

	const initializeDatePicker = () => {
		$(this.fromDate).datepicker({
			onSelect: function(dateText) {
				setFromDate(moment($(this).val(), "MM/DD/YY").format("DD-MMM-YYYY"));
		    },
		    maxDate: "0D"
		});

		$(this.toDate).datepicker({
			onSelect: function(dateText) {
				setToDate(moment($(this).val(), "MM/DD/YY").format("DD-MMM-YYYY"));
		    },
		    maxDate: "0D"
		});
	};

	useEffect(() => {
		initializeDatePicker();
	});

	return <div className="reports-container">
		<div className="title">{props.title}</div>
		<div style={{textAlign: "center"}}>
			{props.fromString}<input type="text" ref={ref => this.fromDate = ref} value={fromDate}/> &nbsp; &nbsp; {props.toString} <input type="text" ref={ref => this.toDate = ref} value={toDate}/>
		</div>

		<div className="">
			{props.children}
		</div>
	</div>
};

const Reports = (props) => {
	return <div>
		<ReportsBlock title="Collections" fromString="Filter results from: " toString="To: ">
			<div style={{ textAlign: "center" }}>
				<div style={{ width: "500px", margin: "20px", display: "inline-block"}}>
					<PieChart 	id="collectionPie" width="500" height="500"
								data={[
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss1", value: 12 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss2", value: 19 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss3", value: 3 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss4", value: 5 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss5", value: 2 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss6", value: 3 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss7", value: 6 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss8", value: 23 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss9", value: 5 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss10", value: 13 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss11", value: 19 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss12", value: 27 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss3", value: 3 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss4", value: 5 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss5", value: 2 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss6", value: 3 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss7", value: 6 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss8", value: 23 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss9", value: 5 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss10", value: 13 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss11", value: 19 },
									{ label: "exec4555555555555555555555555555errrrrrrrrrrrrrrrrrrrrrrdfffffffffffffdssssssssss12", value: 27 },							
								]}/>
				</div>
			</div>
		</ReportsBlock>
	</div>
}

export default Reports;