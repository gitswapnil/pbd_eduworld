import React from 'react';
import PropTypes from 'prop-types';
import { findByType } from 'meteor/pbd-apis';

const Title = () => null;
Title.displayName = "Title";

const Body = () => null;
Body.displayName = "Body";

class Modal extends React.Component {
	constructor(props) {
		super(props);

		this.modalRef = React.createRef();
	}

	componentDidMount() {
		const props = this.props;
		$(this.modalRef.current).on('hidden.bs.modal', function (e) {
			if(props.onHide) {
				props.onHide();
			};
		});

		$(this.modalRef.current).on('shown.bs.modal', function (e) {
			if(props.onShow) {
				props.onShow();
			};
		});
	}

	saveChanges() {
		const props = this.props;
		if(props.onSave) {
			props.onSave();
		}
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

	shouldComponentUpdate(nextProps, nextState) {
		return true;
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		if(this.props.show) {
			$(this.modalRef.current).modal('show');
		} else {
			$(this.modalRef.current).modal('hide');
		}
	}

	render() {
		return (
			<div>
				<div ref={this.modalRef} className="modal fade" tabIndex="-1" role="dialog" aria-labelledby="hModalHeader" aria-hidden="true">
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
								{
									this.props.customOkButton ?
									this.props.customOkButton :
									
									this.props.onSave ? 
									<button type="button" className="btn btn-primary" onClick={this.saveChanges.bind(this)}>Save changes</button>
									: null
								}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

Modal.Title = Title;
Modal.Body = Body;

Modal.propTypes = {
	show: PropTypes.bool.isRequired,
	onHide: PropTypes.func,
	onShow: PropTypes.func,
	onSave: PropTypes.func,
	customOkButton: PropTypes.element
}

export default Modal;