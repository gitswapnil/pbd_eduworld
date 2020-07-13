import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

const BarChart = (props) => {
	const initializeChart = () => {
		const data = props.data;
		const width = props.width;
		const height = props.height;
		const color = "steelblue";
		const margin = ({top: 30, right: 0, bottom: 30, left: 50});

		d3.select(`#${props.id} > svg`).remove();

		const svg = d3.select(`#${props.id}`).append("svg").attr("viewBox", [0, 0, width, height]);

		const x = d3.scaleBand()
				    .domain(d3.range(data.length))
				    .range([margin.left, width - margin.right])
				    .padding(0.1);

		const y = d3.scaleLinear()
				    .domain([0, d3.max(data, d => d.value)]).nice()
				    .range([height - margin.bottom, margin.top]);

		const xAxis = g => g.attr("transform", `translate(0,${height - margin.bottom})`)
						    .call(d3.axisBottom(x).tickFormat(i => data[i].name).tickSizeOuter(0));

		const yAxis = g => g.attr("transform", `translate(${margin.left},0)`)
							.call(d3.axisLeft(y).ticks(null, data.format))
							.call(g => g.select(".domain").remove())
							.call(g => g.append("text")
								.attr("x", -margin.left)
								.attr("y", 10)
								.attr("fill", "currentColor")
								.attr("text-anchor", "start")
								.text(data.y));

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
		    .html("₹" + d.value + "/day")
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
			.attr("fill", color)
		    .selectAll("rect")
		    .data(data)
		    .join("rect")
				.attr("x", (d, i) => x(i))
				.attr("y", d => y(d.value))
				.attr("height", d => y(0) - y(d.value))
				.attr("width", x.bandwidth())
			.on("mouseover", mouseover)
		    .on("mousemove", mousemove)
		    .on("mouseleave", mouseleave);

		svg.append("g").call(xAxis);

		svg.append("g").call(yAxis);

	};

	useEffect(() => {
		initializeChart();
	});

	return <div id={props.id} style={{width: props.width, height: props.height}}></div>
};

export default BarChart;