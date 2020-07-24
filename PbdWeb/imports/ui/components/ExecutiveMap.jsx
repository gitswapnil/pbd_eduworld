import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { MAP_API_KEY } from 'meteor/pbd-apis';

const ExecutiveMap = (props) => {
	const [initializing, setInitializing] = useState(true);
	const [mapObj, setMapObj] = useState({});
	const [markerObj, setMarkerObj] = useState({});
	const [mapUIObj, setMapUIObj] = useState({});
	

	function createMap() {
		// Create a Platform object (one per application):
		const platform = new H.service.Platform({ apikey: MAP_API_KEY });

		// Get an object containing the default map layers:
		const defaultLayers = platform.createDefaultLayers();

		// Instantiate the map using the vecor map with the
		// default style as the base layer:
		const map = new H.Map(
		 	document.getElementById("mapContainer"), 
		 	defaultLayers.vector.normal.map,
		 	{
		      zoom: props.zoom,
		      center: { lat: props.latitude, lng: props.longitude }
		    });

		setMapObj(map);

		// Enable the event system on the map instance:
		const mapEvents = new H.mapevents.MapEvents(map);

		// Instantiate the default behavior, providing the mapEvents object:
		const behavior = new H.mapevents.Behavior(mapEvents);

		const coords = { lat: props.latitude, lng: props.longitude };
		const domSvgMarker =	`<svg enable-background="new 0 0 20.961 26.25" height="26.25px" id="Capa_1" version="1.1" viewBox="0 0 20.961 26.25" width="20.961px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
									<path fill="red" d="M20.961,10.481C20.961,4.692,16.27,0,10.481,0C4.692,0,0,4.692,0,10.481c0,1.036,0.153,2.036,0.433,2.983  C1.925,19.5,10.528,26.25,10.528,26.25s9.718-7.623,10.291-13.911l-0.023-0.005C20.902,11.732,20.961,11.114,20.961,10.481z   M10.624,12.815c-2.368,0-4.288-1.92-4.288-4.288c0-2.368,1.92-4.288,4.288-4.288c2.367,0,4.287,1.92,4.287,4.288  C14.91,10.895,12.991,12.815,10.624,12.815z" />
								</svg>`;
		const icon = new H.map.DomIcon(domSvgMarker);
		const marker = new H.map.DomMarker(coords, { icon });

		setMarkerObj(marker);

		map.addObject(marker);

		if(props.executiveName) {
			// Create an info bubble object at a specific geographic location:
			const bubble = new H.ui.InfoBubble({ lat: props.latitude, lng: props.longitude }, {
				content: `${props.executiveName}`
			});

			const mapUI = new H.ui.UI(map);
			setMapUIObj(mapUI);
			mapUI.addBubble(bubble);
		}
	}

	useEffect(() => {
		console.log(`change in the latitude: ${props.latitude} and longitude ${props.longitude}.`);

		if(initializing) {
			setInitializing(false);
			createMap();
		} else {
			markerObj.setGeometry({ lat: props.latitude, lng: props.longitude });

			if(props.executiveName) {
				const bubble = new H.ui.InfoBubble({ lat: props.latitude, lng: props.longitude }, {
					content: `${props.executiveName}`
				});
				
				mapUIObj.getBubbles().forEach(bubble => mapUIObj.removeBubble(bubble));
				mapUIObj.addBubble(bubble);
			}
		}

	}, [props.latitude, props.longitude]);

	return <div id="mapContainer" style={{height: "100%", width: "100%"}}></div>
}

ExecutiveMap.propTypes = {
	latitude: PropTypes.number.isRequired,
	longitude: PropTypes.number.isRequired,
	executiveName: PropTypes.string,
	zoom: PropTypes.number
};

ExecutiveMap.defaultProps = {
	zoom: 15,
	executiveName: null
};

export default ExecutiveMap;