import React from 'react';
import PropTypes from 'prop-types';
import { findByType } from 'meteor/pbd-apis';

const Button = () => null;
Button.displayName = "Button";

const Title = () => null;
Title.displayName = "Title";

const Body = () => null;
Body.displayName = "Body";

class Modal extends React.Component {
	componentDidMount() {
		const props = this.props;
		$('#mdlDialog').on('hidden.bs.modal', function (e) {
			if(props.onHide) {
				props.onHide();
			};
		});
	}

	saveChanges() {
		const props = this.props;
		if(props.onSave) {
			props.onSave();
		}
	}

	renderButton() {
		const { children } = this.props;
		const button = findByType(children, Button);
		if(!button) {
			return null;
		}

		return (
			<button type="button" className={`btn btn-${button.props.color || 'primary'}`} data-toggle="modal" data-target="#mdlDialog" style={{"boxShadow": "1px 2px 3px #999"}}>
				{button.props.children}		
			</button>
		);
	}

	renderTitle() {
		const { children } = this.props;
		const title = findByType(children, Title);
		if(!title) {
			return null;
		}

		return <div>{title.props.children}</div>
	}

	renderBody() {
		const { children } = this.props;
		const body = findByType(children, Body);
		if(!body) {
			return null;
		}

		return <div>{body.props.children}</div>
	}

	render() {
		return (
			<div>
				{this.renderButton()}
				<div ref={this.props.forwardRef} className="modal fade" id="mdlDialog" tabIndex="-1" role="dialog" aria-labelledby="hModalHeader" aria-hidden="true">
					<div className="modal-dialog modal-lg" role="document">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title" id="hModalHeader">
									{this.renderTitle()}
								</h5>
								<button type="button" className="close" data-dismiss="modal" aria-label="Close">
									<span aria-hidden="true">&times;</span>
								</button>
							</div>
							<div className="modal-body">
								{this.renderBody()}
							</div>
							<div className="modal-footer">
								<button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
								<button type="button" className="btn btn-primary" onClick={this.saveChanges.bind(this)}>Save changes</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

Modal.Button = Button;
Modal.Title = Title;
Modal.Body = Body;

Modal.propTypes = {
	onHide: PropTypes.func,
	onShow: PropTypes.func,
	onSave: PropTypes.func,
}

export default Modal;