import React, { useState } from 'react';
import Footer from './Footer';
import RememberMe from 'meteor/tprzytula:remember-me';

const Login = () => {
	const [phNo, setPhNo] = useState("");
	const [pwd, setPwd] = useState("");
	const [kli, setKli] = useState(true);
	const [error, setError] = useState("");

	function handleSubmit(event) {
		event.preventDefault();
		// console.log("phNo: " + phNo + ", pwd: " + pwd + ", kli: " + kli + ", typeof kli: " + typeof(kli));
		if(phNo === "") {
			setError("Phone number cannot be empty.");
			return;
		}

		if(pwd === "") {
			setError("You need to enter the password.");
			return;
		}

		RememberMe.loginWithPassword(phNo, pwd, (error) => {
			if(error) {
				setError(error.reason);
				return;
			}
		}, kli);
	}

	return (
		<div className="container-fluid">
			<div className="row">
				<div className="col-12">
					<img src={`${Meteor.absoluteUrl('login_background.jpg')}`} className="img-fluid" style={{"width": "100%", "height": "auto", "top": 0, "left": 0, "position": "fixed", "opacity": 0.3}}/>
				</div>
			</div>
			<div className="row">
				<div className="col-6">
					<img src={`${Meteor.absoluteUrl('pbd_logo.png')}`} width="300px"/>
				</div>
				<div className="col-6">
					<div className="row">
						<div className="col-12 text-center">
							<p style={{"fontWeight": "lighter", "fontSize": "xxx-large", "marginTop": "40px"}}>Login</p>
						</div>
					</div>
					<form onSubmit={handleSubmit}>
					  	<div className="form-group row">
					    	<label htmlFor="inPhNumber" className="col-5 col-form-label text-right" style={{"fontSize": "large"}}>Phone No.:</label>
					    	<div className="col-sm-5">
					      		<input type="text" className={`form-control ${(error === "") ? "" : "is-invalid"}`} id="inPhNumber" placeholder="Phone Number" value={phNo} onChange={e => setPhNo(e.target.value)}/>
					    	</div>
						</div>
						<div className="form-group row">
					    	<label htmlFor="inPwd" className="col-5 col-form-label text-right" style={{"fontSize": "large"}}>Password:</label>
					    	<div className="col-sm-5">
					      		<input type="password" className={`form-control ${(error === "") ? "" : "is-invalid"}`} id="inPwd" placeholder="Password" value={pwd} onChange={e => setPwd(e.target.value)}/>
						    	<div className="invalid-feedback">
						        	{error}
						        </div>
					    	</div>
						</div>
						<div className="form-group row">
    						<div className="col-5 offset-5">
      							<div className="form-check">
        							<input className="form-check-input" type="checkbox" id="keepMeLoggedIn" checked={kli} style={{"cursor": "pointer"}} onChange={e => setKli(e.target.checked)}/>
        							<label className="form-check-label" htmlFor="keepMeLoggedIn" style={{"cursor": "pointer"}}>Keep me logged In</label>
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