import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';

if(Meteor.isServer) {
	Meteor.publish('history.getExecutiveDayTransitDetails', function({ execId, date }){
		console.log("Publishing the history.getExecutiveDayTransitDetails...");
		//authorization
		if(this.userId && Roles.userIsInRole(this.userId, 'admin', Roles.GLOBAL_GROUP)) {
			// console.log("date: " + date);
			// console.log("execId: " + execId);
			let dayStart = moment(date).startOf("day").toDate();
			let dayEnd = moment(date).endOf("day").toDate();

			const getDaySnapshot = async () => {
				const getData = (resolve, reject) => {
					Collections.locations.rawCollection().aggregate([
						{
					        $match: {
					            userId: execId, 
					            createdAt: {
					                $gte: dayStart,
					                $lte: dayEnd
					            }
					        }
					    },
					    {
					        $project: {
					            _id: 1, 
					            latitude: 1,
					            longitude: 1,
					            sessionId: 1,
					            createdAt: 1,
					            locationString: { $concat: [ { $toString: "$latitude" }, ":", { $toString: "$longitude" } ] }
					        }
					    },
					    { $sort: { createdAt: 1 } },
					    {
					        $group: {
					            _id: "$sessionId",
					            locations: {
					                $addToSet: {
					                    latitude: "$latitude",
					                    longitude: "$longitude",
					                    createdAt: "$createdAt",
					                    locationString: "$locationString"
					                }
					            }
					        }
					    },
					], ((err, cursor) => {
						if(err) reject(err);

						cursor.toArray(((error, docs) => {
							if(error) reject(error);
							// console.log("docs: " + JSON.stringify(docs));

							resolve.apply(this, [docs]);
						}).bind(this));
					}).bind(this));
				};

				const prmse = new Promise(getData.bind(this));

				const snapShot = await prmse;

				return snapShot;
			}

			getDaySnapshot.apply(this).then(docs => {
				// console.log("docs: " + JSON.stringify(docs));
				docs.forEach(item => {
					this.added("locations", item._id, item);
				});

				this.ready();
			}).catch(err => {
				throw new Meteor.Error("publication-error", err);
			});

			console.log("data publication for \"history.getExecutiveDayTransitDetails is complete.\"");
			this.onStop(() => {
				this.stop();
				console.log("Publication, \"history.getExecutiveDayTransitDetails\" is stopped.");
			});
		} else {
			this.ready();
		}
	});
}

if(Meteor.isClient) {
	import React, { useState, useEffect } from 'react';
	import PropTypes from 'prop-types';
	import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
	import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

	import { MAP_API_KEY } from 'meteor/pbd-apis';

	const ExecutiveDaySnapshot = (props) => {
		const [loading, setLoading] = useState(true);
		const [noData, setNoData] = useState(false);
		
		const [markerObj, setMarkerObj] = useState({});
		const [mapUIObj, setMapUIObj] = useState({});

		function createMap(locations) {
			// Create a Platform object (one per application):
			const platform = new H.service.Platform({ apikey: MAP_API_KEY });

			// Get an object containing the default map layers:
			const defaultLayers = platform.createDefaultLayers();

			// Instantiate the map using the vecor map with the
			// default style as the base layer:
			const map = new H.Map(
			 	document.getElementById("routeMapContainer"), 
			 	defaultLayers.vector.normal.map,
			 	{ zoom: props.zoom, center: { lat: locations[0].locations[0].latitude, lng: locations[0].locations[0].longitude } });

			// Define points to represent the vertices of a short route in Berlin, Germany:
			let linePoints = [];
			let markers = [];

			locations.forEach(session => {
				let tempArr = [];

				let prevLocationString = "";
				session.locations.forEach(location => {
					// console.log("location: " + JSON.stringify(location));
					if(prevLocationString !== location.locationString) {
						tempArr.push({ lat: location.latitude, lng: location.longitude });
						prevLocationString = location.locationString;
					}
				});
				linePoints.push(tempArr);
			});

			let polyline;

			linePoints = linePoints.filter(points => points.length > 1);

			console.log("linePoints: " + JSON.stringify(linePoints));
			linePoints.forEach((arr, index) => {
				let linestring = new H.geo.LineString();

				arr.forEach(points => {
					linestring.pushPoint(points);
				});

				polyline = new H.map.Polyline(linestring, { style: { lineWidth: 10 }});
				map.addObject(polyline);
			});

			if(polyline) {
				// Zoom the map to fit the rectangle:
				map.getViewModel().setLookAtData({bounds: polyline.getBoundingBox()});
			}

			// Enable the event system on the map instance:
			const mapEvents = new H.mapevents.MapEvents(map);

			// Instantiate the default behavior, providing the mapEvents object:
			const behavior = new H.mapevents.Behavior(mapEvents);
		}

		useEffect(() => {
			setLoading(true);
			setNoData(false);
			document.getElementById("routeMapContainer").innerHTML = "";

			const handle = Meteor.subscribe('history.getExecutiveDayTransitDetails', { execId: props.execId, date: props.date }, {
				onStop(error) {
					console.log("history.getExecutiveDayTransitDetails is stopped.");
					if(error) {
						console.log(error);
					}
				},

				onReady() {
					console.log("history.getExecutiveDayTransitDetails is ready to get the data.");
					const newLocations = Collections.locations.find().fetch();

					setLoading(false);

					if(newLocations.length) {
						createMap(newLocations);
					} else {
						setNoData(true);
					}

					this.stop();
				}
			});

			return function() {
				handle.stop();

			}
		}, [props.execId, props.date]);

		return 	<div style={{height: "100%", width: "100%", textAlign: "center"}}>
					<div style={{ display: loading ? "block" : "none" }}>
						<FontAwesomeIcon icon={faCircleNotch} spin/> Loading...
					</div>
					{ noData ? <div> No location data present for {moment(props.date).format("DD-MMM-YYYY")} </div> : null }
					<div id="routeMapContainer" style={{height: "100%", width: "100%", display: loading ? "none" : "block"}}></div>
				</div>
	};

	ExecutiveDaySnapshot.propTypes = {
		date: PropTypes.instanceOf(Date).isRequired,
		execId: PropTypes.string.isRequired,
		zoom: PropTypes.number
	};

	ExecutiveDaySnapshot.defaultProps = {
		zoom: 15,
		execId: null
	};

	export default ExecutiveDaySnapshot;

}
