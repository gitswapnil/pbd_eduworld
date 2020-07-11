import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

const PieChart = (props) => {
	const initializeChart = () => {
		const data = props.data;
		const width = props.width;
		const height = props.height;
		const margin = 50;

		const color = d3.scaleOrdinal()
						.domain(data.map(d => d.name))
						.range(d3.quantize(t => d3.interpolateSpectral(t * 1 + 0.1), data.length).reverse())
  
		const arc = d3.arc()
						.innerRadius(0)
						.outerRadius(Math.min(width, height) / 2 - 1);

		const radius = Math.min(width, height) / 2 * 0.8;
		const arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);

		const pie = d3.pie()
		              .sort(null)
		              .value(d => d.value);

		const arcs = pie(data);

		d3.select(`#${props.id} > svg`).remove();
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
		    .style("left", (d3.event.pageX - $('.sections-column').width() + 15) + "px")
		    .style("top", (d3.event.pageY + 15) + "px")
		}

		//mouseLeave
		const mouseleave = function(d) {
		  Tooltip
		    .style("opacity", 0)
		  d3.select(this)
		    .style("stroke", "none")
		    .style("opacity", 1)
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

	return <div id={props.id} style={{width: props.width, height: props.height}}></div>
}

export default PieChart;