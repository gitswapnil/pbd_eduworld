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
							<th key={obj.data} style={obj.style}>{obj.data}</th>
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
					body.props.dataArray.map((subArr, index) => 
						<tr key={index} className="row-selectable">
							{
								subArr.map(obj => 
									<td key={obj.data} style={obj.style}>{obj.data}</td>
								)
							}
						</tr>
					)
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