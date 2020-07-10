import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

const data = [
  { name: "Sanjay", value: 56423.01 }, 
  { name: "Nelson", value: 12302 },
  { name: "Umesh", value: 65923 },
  { name: "Suresh", value: 89956 },
  { name: "exec1", value: 123456 },
  { name: "exec2", value: 54234 },
  { name: "exec3", value: 23546 },
  { name: "exec4", value: 25876 },
  { name: "exec5", value: 86754 },
];

// const colors = [
// 	{ name: "red", mainColor: 'rgba(255, 99, 132, 0.6)', borderColor:  'rgba(255, 99, 132, 1)'},
// 	{ name: "Blue", mainColor: 'rgba(54, 162, 235, 0.6)', borderColor:  'rgba(54, 162, 235, 1)'},
// 	{ name: "Yellow", mainColor: 'rgba(255, 206, 86, 0.6)', borderColor:  'rgba(255, 206, 86, 1)'},
// 	{ name: "Green", mainColor: 'rgba(75, 192, 192, 0.6)', borderColor:  'rgba(75, 192, 192, 1)'},
// 	{ name: "Purple", mainColor: 'rgba(153, 102, 255, 0.6)', borderColor:  'rgba(153, 102, 255, 1)'},
// 	{ name: "Orange", mainColor: 'rgba(255, 159, 64, 0.6)', borderColor:  'rgba(255, 159, 64, 1)'},
// 	{ name: "maroon", mainColor: 'rgba(128, 0, 0, 0.6)', borderColor:  'rgba(128, 0, 0, 1)'},
// 	{ name: "gold", mainColor: 'rgba(255, 215, 0, 0.6)', borderColor:  'rgba(255, 215, 0, 1)'},
// 	{ name: "dark green", mainColor: 'rgba(0, 100, 0, 0.6)', borderColor:  'rgba(0, 100, 0, 1)'},
// 	{ name: "aqua", mainColor: 'rgba(0, 255, 255, 0.6)', borderColor:  'rgba(0, 255, 255, 1)'},
// 	{ name: "medium orchid", mainColor: 'rgba(186, 85, 211, 0.6)', borderColor:  'rgba(186, 85, 211, 1)'},
// 	{ name: "chocolate", mainColor: 'rgba(210, 105, 30, 0.6)', borderColor:  'rgba(210, 105, 30, 1)'},
// 	{ name: "light steel blue", mainColor: 'rgba(176, 196, 222, 0.6)', borderColor:  'rgba(176, 196, 222, 1)'},
// 	{ name: "crimson", mainColor: 'rgba(220, 20, 60, 0.6)', borderColor:  'rgba(220, 20, 60, 1)'},
// 	{ name: "lawn green", mainColor: 'rgba(124, 252, 0, 0.6)', borderColor:  'rgba(124, 252, 0, 1)'},
// 	{ name: "deep pink", mainColor: 'rgba(255, 20, 147, 0.6)', borderColor:  'rgba(255, 20, 147, 1)'},
// 	{ name: "lavender", mainColor: 'rgba(230, 230, 250, 0.6)', borderColor:  'rgba(230, 230, 250, 1)'},
// 	{ name: "dark khaki", mainColor: 'rgba(189, 183, 107, 0.6)', borderColor:  'rgba(189, 183, 107, 1)'},
// 	{ name: "orange red", mainColor: 'rgba(255, 69, 0, 0.6)', borderColor:  'rgba(255, 69, 0, 1)'},
// 	{ name: "olive drab", mainColor: 'rgba(107, 142, 35, 0.6)', borderColor:  'rgba(107, 142, 35, 1)'},
// 	{ name: "rosy brown", mainColor: 'rgba(188, 143, 143, 0.6)', borderColor:  'rgba(188, 143, 143, 1)'},
// 	{ name: "dark gray", mainColor: 'rgba(169, 169, 169, 0.6)', borderColor:  'rgba(169, 169, 169, 1)'},
// 	{ name: "magenta", mainColor: 'rgba(255, 0, 255, 0.6)', borderColor:  'rgba(255, 0, 255, 1)'},
// 	{ name: "spring green", mainColor: 'rgba(0, 255, 127, 0.6)', borderColor:  'rgba(0, 255, 127, 1)'},
// 	{ name: "khaki", mainColor: 'rgba(240, 230, 140, 0.6)', borderColor:  'rgba(240, 230, 140, 1)'},
// 	{ name: "medium purple", mainColor: 'rgba(147, 112, 219, 0.6)', borderColor:  'rgba(147, 112, 219, 1)'},
// 	{ name: "wheat", mainColor: 'rgba(245, 222, 179, 0.6)', borderColor:  'rgba(245, 222, 179, 1)'},
// 	{ name: "dodger blue", mainColor: 'rgba(30, 144, 255, 0.6)', borderColor:  'rgba(30, 144, 255, 1)'},
// 	{ name: "lime", mainColor: 'rgba(0, 255, 0, 0.6)', borderColor:  'rgba(0, 255, 0, 1)'},
// 	{ name: "salmon", mainColor: 'rgba(250, 128, 114, 0.6)', borderColor:  'rgba(250, 128, 114, 1)'},
// 	{ name: "turquoise", mainColor: 'rgba(64, 224, 208, 0.6)', borderColor:  'rgba(64, 224, 208, 1)'},
// 	{ name: "sienna", mainColor: 'rgba(160, 82, 45, 0.6)', borderColor:  'rgba(160, 82, 45, 1)'},
// 	{ name: "pink", mainColor: 'rgba(255, 192, 203, 0.6)', borderColor:  'rgba(255, 192, 203, 1)'},
// 	{ name: "golden rod", mainColor: 'rgba(218, 165, 32, 0.6)', borderColor:  'rgba(218, 165, 32, 1)'},
// 	{ name: "tomato", mainColor: 'rgba(255, 99, 71, 0.6)', borderColor:  'rgba(255, 99, 71, 1)'},
// ]

const PieChart = (props) => {
	const initializeChart = () => {
		const width = props.width;
		const height = props.height;
		const margin = 50;

		const color = d3.scaleOrdinal()
						.domain(data.map(d => d.name))
						.range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length).reverse())
  
		const arc = d3.arc()
						.innerRadius(0)
						.outerRadius(Math.min(width, height) / 2 - 1);

		const radius = Math.min(width, height) / 2 * 0.8;
		const arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);

		const pie = d3.pie()
		              .sort(null)
		              .value(d => d.value);

		const arcs = pie(data);

		const svg = d3.select(`#${props.id}`).append("svg").attr("viewBox", [-width / 2, -height / 2, width, height]);


		//tooltip
		const Tooltip = d3.select(`#${props.id}`)
						    .append("div")
						    .style("opacity", 0)
						    .style("position", "absolute")
						    .style("background-color", "white")
						    .style("border", "solid")
						    .style("border-width", "2px")
						    .style("border-radius", "5px")
						    .style("padding", "5px");

		//mouseover
		const mouseover = function(d) {
		  Tooltip
		    .style("opacity", 1)
		  d3.select(this)
		    .style("stroke", "black")
		    .style("opacity", 1)
		}

		//mousemove
		const mousemove = function(d) {
		  Tooltip
		    .html("₹" + d.value)
		    .style("left", `${d3.event.pageX - (props.width / 2) + 50}px`)
		    .style("top", `${d3.event.pageY + 10}px`)
		}

		//mouseLeave
		const mouseleave = function(d) {
		  Tooltip
		    .style("opacity", 0)
		  d3.select(this)
		    .style("stroke", "none")
		    .style("opacity", 0.8)
		}

		svg.append("g")
		    .attr("stroke", "white")
		    .selectAll("path")
		    .data(arcs)
		    .join("path")
		     	.attr("fill", d => color(d.data.name))
		     	.attr("d", arc)
		    .on("mouseover", mouseover)
		    .on("mousemove", mousemove)
		    .on("mouseleave", mouseleave)

		svg.append("g")
		  	.attr("font-family", "sans-serif")
		  	.attr("font-size", 12)
		  	.attr("text-anchor", "middle")
			.selectAll("text")
			.data(arcs)
			.join("text")
		  		.attr("transform", d => `translate(${arcLabel.centroid(d)})`)
		  		.call(text => text.append("tspan")
		      	.attr("y", "-0.4em")
		      	.attr("font-weight", "bold")
		      	.text(d => d.data.name))
		  		.call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
		      	.attr("x", 0)
		      	.attr("y", "0.7em")
			    .attr("fill-opacity", 0.7)
		      	.text(d => d.data.value.toLocaleString()))
			
	};

	useEffect(() => {
		initializeChart();
	});

	return <div id={props.id} width={props.width} height={props.height}></div>
}

export default PieChart;