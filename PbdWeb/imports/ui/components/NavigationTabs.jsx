import React, { useState } from 'react';

const NavigationTabs = (props) => {
	return (
		<div>
			<div className="nav-tabs-container">
				{
					props.tabs.map(tab => {
						return (
							<div key={tab.name} className={`${tab.selected ? "selected" : ""}`} onClick={() => Router.go(tab.link)}>
								{tab.name}
							</div>
						)
					})
				}
			</div>
			<div className="tabs-content-container">
				{props.children}
			</div>
		</div>
	);
}

export default NavigationTabs;