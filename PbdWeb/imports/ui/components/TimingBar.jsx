import React, { useState, useEffect } from 'react';

const DUTY_START_TIME = "10:00";		//format should always be in HH:MM
const DUTY_END_TIME = "18:00";

const TimingBar = (props) => {
	const dutyStartTime = moment(`${moment().format("DD-MM-YYYY")} ${DUTY_START_TIME}`, "DD-MM-YYYY HH:mm").unix();
	const dutyEndTime = moment(`${moment().format("DD-MM-YYYY")} ${DUTY_END_TIME}`, "DD-MM-YYYY HH:mm").unix();
	let dutyTimeStartMargin = "0%";
	let dutyTimeEndMargin = "100%";

	let incomingData = [...props.data];
	console.log("incomingData: " + JSON.stringify(incomingData));
	const dataStart = moment(incomingData[0].start).unix();
	const dataEnd = moment(incomingData[incomingData.length-1].end).unix();

	let start = dutyStartTime;
	if(dataStart < dutyStartTime) {
		start = dataStart;
	}

	let end = dutyEndTime;
	if(dataEnd > dutyEndTime) {
		end = dataEnd;
	}

	const totalDiff = end - start;
	
	if(start < dutyStartTime) {
		dutyTimeStartMargin = `${((dutyStartTime - start) / totalDiff) * 100}%`;
	}
	
	if(end > dutyEndTime) {
		dutyTimeEndMargin = `${((dutyEndTime - start) / totalDiff) * 100}%`;
	}

	let data = [];
	incomingData.forEach((session, index) => {
		if(index == 0) {
			if(dutyStartTime < dataStart) {
				data.push({
					tag: "offline",
					start: moment.unix(dutyStartTime).toDate(),
					end: session.start
				});
			}
		} else {
			data.push({
				tag: "offline",
				start: incomingData[index - 1].end,
				end: session.start
			})
		}

		data.push({
			tag: "ongoing",
			start: session.start,
			end: session.end
		})
	});

	const drawingData = data.map(session => {
		const tag = session.tag;
		const period = moment(session.end).unix() - moment(session.start).unix();
		const sessionStart = moment(session.start).format("H:mm");
		const sessionEnd = moment(session.end).format("H:mm");
		const sessionWidth = `${((period / totalDiff) * 100).toFixed(2)}%`;
		// const leftMargin = `${((moment(data[sessionId].start).unix() - start) / totalDiff) * 100}%`;

		return {tag, sessionStart, sessionEnd, sessionWidth};
	});

	useEffect(() => {
		$('.timing-bar').children().hover(function() {
			$(this).children('.start-tip, .end-tip').removeClass("hidden");
		}, function(){
			$(this).children('.start-tip, .end-tip').addClass("hidden");
		})
	})

	return (
		<div>
			<div className="timing-bar-duty-time" style={{marginLeft: dutyTimeStartMargin, float: "left"}}>
				<div className="duty-time-tip">
					<div>{moment.unix(dutyStartTime).format("H:mm")}</div>
					<div></div>
				</div>
			</div>
			<div className="timing-bar-duty-time" style={{marginLeft: dutyTimeEndMargin}}>
				<div className="duty-time-tip">
					<div>{moment.unix(dutyEndTime).format("H:mm")}</div>
					<div></div>
				</div>
			</div>
			<div className="timing-bar">
				{
					drawingData.map(session => 
						<div key={session.sessionId} className={`timing-duty-${session.tag}`} style={{width: session.sessionWidth}}>
							<div className="start-tip hidden">
								<div className="tip-time">
									{session.sessionStart}
								</div>
							</div>
							<div className="main-section"></div>
							<div className="end-tip hidden">
								<div className="tip-time">
									{session.sessionEnd}
								</div>
							</div>
						</div>
					)
				}
				<div style={{clear: "both"}}></div>
			</div>
		</div>
	)
}

export default TimingBar;