import React from 'react';

const Tab = (props) => {
	return (
		<div>
			{props.name}<br/>
			{props.children}
		</div>
	)
}

export default Tab;