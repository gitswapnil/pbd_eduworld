import React from 'react';
import PropTypes from 'prop-types';
import { findByType } from 'meteor/pbd-apis';

const Header = () => null;
Header.displayName = "Header";

const Body = () => null;
Body.displayName = "Body";

class Table extends React.Component {
	renderHeader() {
		const { children } = this.props;
		const header = findByType(children, Header);

		if(!header) {
			return null;
		}

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
					body.props.dataArray.map(rowObj => {
						// console.log("rowObj: " + JSON.stringify(rowObj));
						return !rowObj ? null : !rowObj.rowAttributes ? null :
						<tr {...rowObj.rowAttributes}>
							{
								!rowObj.cells ? null :
								rowObj.cells.map(cellObj => 
									<td key={cellObj.content} style={cellObj.style}>{cellObj.content}</td>
								)
							}
						</tr>

					})
				}
				
			</tbody>
		);
	}

	render() {
		return (
			<div>
				<table className="tbl">
					{this.renderHeader()}
					{this.renderBody()}
				</table>
			</div>
		)

	}
}

Table.Header = Header;
Table.Body = Body;

export default Table;