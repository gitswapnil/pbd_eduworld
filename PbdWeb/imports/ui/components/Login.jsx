import React, { useState } from 'react';
import Footer from './Footer';

const Login = () => {

	return (
		<div className="container-fluid">
			<div className="row">
				<div className="col-12">
					<img src="login_background.jpg" className="img-fluid" style={{"width": "100%", "height": "auto", "top": 0, "left": 0, "position": "fixed", "opacity": 0.3}}/>
				</div>
			</div>
			<div className="row">
				<div className="col-6">
					<img src="pbd_logo.png" width="300px"/>
				</div>
				<div className="col-6">
					<div className="row">
						<div className="col-12 text-center">
							<p style={{"fontWeight": "lighter", "fontSize": "xxx-large", "marginTop": "40px"}}>Login</p>
						</div>
					</div>
					<form>
					  	<div className="form-group row">
					    	<label for="phNumber" className="col-5 col-form-label text-right" style={{"fontSize": "large"}}>Phone No.:</label>
					    	<div className="col-sm-5">
					      		<input type="text" className="form-control" id="phNumber" placeholder="Phone Number"/>
					    	</div>
						</div>
						<div className="form-group row">
					    	<label for="pwd" className="col-5 col-form-label text-right" style={{"fontSize": "large"}}>Password:</label>
					    	<div className="col-sm-5">
					      		<input type="text" className="form-control" id="pwd" placeholder="Password"/>
					    	</div>
						</div>
						<div className="form-group row">
    						<div className="col-5 offset-5">
      							<div className="form-check">
        							<input className="form-check-input" type="checkbox" id="keepMeLoggedIn" style={{"cursor": "pointer"}}/>
        							<label className="form-check-label" for="keepMeLoggedIn" style={{"cursor": "pointer"}}>Keep me logged In</label>
      							</div>
    						</div>
  						</div>
  						<div className="form-group row">
							<div className="col-5 offset-5">
						    	<button type="submit" className="btn btn-primary">&nbsp;&nbsp;&nbsp;Login&nbsp;&nbsp;&nbsp;</button>
							</div>
						</div>
						<div className="form-group row">
							<div className="col-12 text-center">
						    	Forgot your password? <a href="#">Click here</a>
							</div>
						</div>
					</form>
				</div>
			</div>
			<div style={{"position": "absolute", "bottom": 0, "width": "97%"}}>
				<Footer/>
			</div>
		</div>
	)
}

export default Login;