import React from 'react';
import memoize from "memoize-one";
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { findByType } from 'meteor/pbd-apis';

const Header = () => null;
Header.displayName = "Header";

const Body = () => null;
Body.displayName = "Body";

class Table extends React.Component {

	state = {
		columns: 0,
	}

	tableInfo = memoize((totalPages, selectedPage, onPageSelect) => [totalPages, selectedPage, onPageSelect]);
	// constructor(props) {
	// 	super(props);

	// 	this.state = {
	// 		totalPages: props.totalPages,
	// 		selectedPage: props.selectedPage,
	// 		onPageSelect: props.onPageSelect,
	// 	}
	// }

	renderHeader() {
		const { children } = this.props;
		const header = findByType(children, Header);

		if(!header) {
			return null;
		}

		this.state.columns = header.props.dataArray.length;

		return (
			<thead>
				<tr>
					{
						header.props.dataArray.map(obj => 
							<th key={obj.content} style={obj.style}>{obj.content}</th>
						)
					}
				</tr>
			</thead>
		);
	}

	renderBody() {
		const { children } = this.props;
		const body = findByType(children, Body);

		if(!body) {
			return null;
		}

		return (
			<tbody>
				{
					(body.props.dataArray == null) ? 
					<tr>
						<td colSpan={this.state.columns} style={{textAlign: "center"}}>
							<FontAwesomeIcon icon={faCircleNotch} spin/> Loading...
						</td>
					</tr>
					:
					!body.props.dataArray.length ? 
					<tr>
						<td colSpan={this.state.columns} style={{textAlign: "center"}}>No Data</td>
					</tr>
					:
					body.props.dataArray.map(rowObj => {
						// console.log("rowObj: " + JSON.stringify(rowObj));
						return !rowObj ? null : !rowObj.rowAttributes ? null :
						<tr {...rowObj.rowAttributes}>
							{
								!rowObj.cells ? null :
								rowObj.cells.map(cellObj => 
									<td key={cellObj.key || cellObj.content} style={cellObj.style}>{cellObj.content}</td>
								)
							}
						</tr>

					})
				}
				
			</tbody>
		);
	}

	render() {
		const newTableInfo = this.tableInfo(this.props.totalPages, this.props.selectedPage, this.props.onPageSelect);
		const totalPages = newTableInfo[0];
		const selectedPage = newTableInfo[1];
		const onPageSelect = newTableInfo[2];

		const sectionWidth = 5;
		let buttons = [];

		const sections = Math.ceil(totalPages/sectionWidth);
		const selectedPageSectionNo = Math.ceil(selectedPage/sectionWidth);

		let sectionMaxNum = totalPages; 
		if(totalPages > sectionWidth) {
			sectionMaxNum = selectedPageSectionNo * sectionWidth;

			if(sectionMaxNum > totalPages) {
				sectionMaxNum = totalPages;
			}
		}

		let sectionMinNum = sectionMaxNum - sectionWidth;
		if(sectionMinNum < 0) {
			sectionMinNum = 0;
		}

		if(sectionMinNum === 0) {
			for(let i=1; i<=sectionMaxNum; i++) 
				buttons.push(<button key={i} type="button" className="btn btn-light" disabled={selectedPage === i} onClick={() => onPageSelect(i)}>{i}</button>);
		} else {
			buttons.push(<button key={1} type="button" className="btn btn-light" onClick={() => onPageSelect(1)}>1</button>);
			buttons.push(<button key={"...1"} type="button" className="btn btn-light" disabled={true}>...</button>);
			for(let i=sectionMinNum; i<=sectionMaxNum; i++) 
				buttons.push(<button key={i} type="button" className="btn btn-light" disabled={selectedPage === i} onClick={() => onPageSelect(i)}>{i}</button>);
		}

		if(totalPages === (sectionMaxNum + 1)) {
			buttons.push(<button key={sectionMaxNum + 1} type="button" className="btn btn-light" onClick={() => onPageSelect(sectionMaxNum + 1)}>{sectionMaxNum + 1}</button>);
		} else if(totalPages === (sectionMaxNum + 2)) {
			buttons.push(<button key={sectionMaxNum + 1} type="button" className="btn btn-light" onClick={() => onPageSelect(sectionMaxNum + 1)}>{sectionMaxNum + 1}</button>);
			buttons.push(<button key={sectionMaxNum + 2} type="button" className="btn btn-light" onClick={() => onPageSelect(sectionMaxNum + 2)}>{sectionMaxNum + 2}</button>);
		} else if(totalPages > (sectionMaxNum + 2)) {
			buttons.push(<button key={sectionMaxNum + 1} type="button" className="btn btn-light" onClick={() => onPageSelect(sectionMaxNum + 1)}>{sectionMaxNum + 1}</button>);
			buttons.push(<button key={"...2"} type="button" className="btn btn-light" disabled={true}>...</button>);
			buttons.push(<button key={totalPages} type="button" className="btn btn-light" onClick={() => onPageSelect(totalPages)}>{totalPages}</button>);
		}

		return (
			<div>
				<table className="tbl">
					{this.renderHeader()}
					{this.renderBody()}
				</table>
				<br/>
				<div className="text-right">
					<div className="btn-group" role="group" aria-label="Paginantion-group">
					    {buttons}
					</div>
				</div>
				<br/>
			</div>
		)

	}
}

Table.Header = Header;
Table.Body = Body;

Table.propTypes = {
	selectedPage: PropTypes.number,
	totalPages: PropTypes.number,
	onPageSelect: PropTypes.func,
}

export default Table;