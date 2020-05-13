import React, { useState } from 'react';

const TabsArea = (props) => {
	let tabs = [];

	props.children.map(child => {
		tabs.push({id: child.props.id, name: child.props.name});
	});

	const [selectedTabId, setSelectedTabId] = useState(props.children[0].props.id);

	return (
		<div>
			<div className="nav-tabs-container">
				{
					tabs.map(tab => {
						return (
							<div key={tab.id} className={`${tab.id === selectedTabId ? "selected" : ""}`} onClick={() => setSelectedTabId(tab.id)}>
								{tab.name}
							</div>
						)
					})
				}
			</div>
			<div className="tabs-content-container">
				{
					props.children.map(child => {
						if (child.props.id === selectedTabId) {
							return <div>{child.props.children}</div>
						}
					})
				}
			</div>
		</div>
	);
}

export default TabsArea;