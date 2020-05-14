import React, { useState, useEffect } from 'react';

const NavigationTabs = (props) => {
	useEffect(() => {
		const windowHeight = $(window).height();
		const containerRequiredHeight = parseInt(windowHeight) - 130;
		$('div.tabs-content-container').height(`${containerRequiredHeight}px`);
	});

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
			<div className="tabs-content-container" style={{"padding": "0 20px"}}>
				{props.children}
			</div>
		</div>
	);
}

export default NavigationTabs;