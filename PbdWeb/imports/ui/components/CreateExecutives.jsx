import React from 'react';

const CreateExecutives = () => {
	return(
		<div className="container">
			<br/>
			<div className="row">
				<div className="col-12 text-right">
					<button type="button" className="btn btn-primary" style={{"boxShadow": "1px 2px 3px #999"}}>
						&nbsp;&nbsp;Create New Executive&nbsp;&nbsp;
					</button>
				</div>
			</div>
			<br/>
			<div className="row">
				<div className="col-12">
					<table class="tbl">
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
								<td colspan="2">Larry tde Bird</td>
								<td>@twitter</td>
							</tr>
							<tr>
								<td className="text-right">3</td>
								<td colspan="2">Larry tde Bird</td>
								<td>@twitter</td>
							</tr>
							<tr>
								<td className="text-right">3</td>
								<td colspan="2">Larry tde Bird</td>
								<td>@twitter</td>
							</tr>
							<tr>
								<td className="text-right">3</td>
								<td colspan="2">Larry tde Bird</td>
								<td>@twitter</td>
							</tr>
							<tr>
								<td className="text-right">3</td>
								<td colspan="2">Larry tde Bird</td>
								<td>@twitter</td>
							</tr>
							<tr>
								<td className="text-right">3</td>
								<td colspan="2">Larry the Bird</td>
								<td>@twitter</td>
							</tr>
							
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default CreateExecutives;