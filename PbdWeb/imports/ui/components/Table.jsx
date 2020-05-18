import React from 'react';

const Table = (props) => {
	return (
		<div>
			<table className="tbl">
				<thead>
					<tr>
						<th className="text-right">Sl. No.</th>
						<th>Name</th>
						<th>Phone No.</th>
						<th>Updated on</th>
					</tr>
				</thead>
				<tbody>
					<tr className="row-selectable">
						<td className="text-right">1</td>
						<td>Swapnil Bandiwadekar</td>
						<td>9686059262</td>
						<td>12-May-2020</td>
					</tr>
					<tr>
						<td className="text-right">2</td>
						<td>Jacob</td>
						<td>tdornton</td>
						<td>@fat</td>
					</tr>
					<tr>
						<td className="text-right">3</td>
						<td colSpan="2">Larry tde Bird</td>
						<td>@twitter</td>
					</tr>
					<tr>
						<td className="text-right">3</td>
						<td colSpan="2">Larry tde Bird</td>
						<td>@twitter</td>
					</tr>
					<tr>
						<td className="text-right">3</td>
						<td colSpan="2">Larry tde Bird</td>
						<td>@twitter</td>
					</tr>
					<tr>
						<td className="text-right">3</td>
						<td colSpan="2">Larry tde Bird</td>
						<td>@twitter</td>
					</tr>
					<tr>
						<td className="text-right">3</td>
						<td colSpan="2">Larry tde Bird</td>
						<td>@twitter</td>
					</tr>
					<tr>
						<td className="text-right">3</td>
						<td colSpan="2">Larry the Bird</td>
						<td>@twitter</td>
					</tr>
					
				</tbody>
			</table>
		</div>
	)
}

export default Table;