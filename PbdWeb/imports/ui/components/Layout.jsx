import React from 'react';
import { Meteor } from 'meteor/meteor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faSignOutAlt, faUserCircle } from '@fortawesome/free-solid-svg-icons';

import Footer from './Footer';


const Layout = (props) => {
	return (
		<div className="container-fluid">
			<div className="row">
				<div className="col-2" style={{"padding": 0}}>
					<div className="text-center">
						<img src={`${Meteor.absoluteUrl('pbd_logo.png')}`} width="150px" style={{"margin": "8px 0"}}/>
					</div>
					<div className="img-container-with-text" style={{"width": "115%", "marginTop": "30px"}}>
						<img src={`${Meteor.absoluteUrl('section_tab.png')}`} width="100%"/>
						<div className="centered-img-text" style={{"fontWeight": "bold", "fontSize": "larger"}}>Dashboard</div>
					</div>
				</div>
				<div className="col-10 text-right" >
					<div className="btn-group">
						<button type="button" className="btn btn-outline-secondary dropdown-toggle" style={{"borderRadius": "0 0 5px 5px", "boxShadow": "2px 0px 5px #b0b0b0"}} data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							<FontAwesomeIcon icon={faUserCircle} size="lg"/>&nbsp;
					    	{
								(Meteor.user().profile.name || <i className="text-muted">No Name Found</i>)
							}&nbsp;
						</button>
						<div className="dropdown-menu dropdown-menu-right">
							<a className="dropdown-item" href={`${Meteor.absoluteUrl('profile/settings')}`}>
								<FontAwesomeIcon icon={faCog}/>&nbsp;
								Settings
							</a>
							<div className="dropdown-divider"></div>
							<a className="dropdown-item" href={`${Meteor.absoluteUrl('logout')}`}>
								<FontAwesomeIcon icon={faSignOutAlt}/>&nbsp;
								Logout
							</a>
						</div>
					</div>
				</div>
			</div>
			<div className="row">
				<div className="col-12">
					<Footer/>
				</div>
			</div>
		</div>
	)
}

export default Layout;