import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {FormattedData, ProgressDataEntry, Theme} from "@/types";

import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";
import {drawLegend, measureWidth} from "@/app/components/StatusPanel_functions";
import {COLOR_SCALE, COLORS} from "@/constants/constants";
interface ProgressPanelProps {
    progressData: ProgressDataEntry[];
}
const ProgressPanel: FC<ProgressPanelProps> = ({ progressData }) => {
    const [tick, setTick] = useState(0);

    // Modified hook that returns the tick value
    useEffect(() => {
        const handleResize = () => setTick(t => t + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const ref = useRef(null);
    const margins = { left: 20, right: 20, top: 80, middle: 40, bottom: 60 };

    useEffect(() => {
        if (!ref.current) return;
        const svg = d3.select<SVGSVGElement, unknown>(ref.current);
        const svgNode = svg.node();
        if (!svgNode) return;


        const containerNode = svgNode.parentElement;
        if (!containerNode) return;
        const { clientHeight: svgHeight, clientWidth: svgWidth } =
            containerNode;
        svg.attr("width", svgWidth).attr("height", svgHeight);


        const fontSize = getRem() * 1.5;

        const currentYear = Math.max(new Date().getFullYear(), 2025);
        const currentYearData = progressData.find((f) => f.year === currentYear);
        let currentYearTotal = 1;
        if(currentYearData){
            const { year, ...metrics } = currentYearData;
            currentYearTotal = d3.sum(Object.values(metrics));
        }

        svg.select(".dataTitle")
            .attr("x",margins.left)
            .attr("y",fontSize)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.darkgrey)
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("PROGRESS towards goal");

        svg.select(".datasetsCount")
            .attr("pointer-events","none")
            .attr("x",svgWidth - margins.right)
            .attr("y",fontSize * 0.8)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.black)
            .attr("font-weight",500)
            .attr("text-anchor","end")
            .text(`${currentYearTotal} datasets*`);

        drawLegend(svg,fontSize,margins.left, svgHeight - fontSize/2);

        const chartTotalHeight =
            svgHeight - margins.top - margins.bottom - margins.middle;


        const proportionMissing = (currentYearData?.missing || 0) / currentYearTotal;
        const missingHeight = chartTotalHeight * proportionMissing;
        const streamHeight = chartTotalHeight - missingHeight;

        const years = progressData
            .map((m) => m.year)
            .sort((a, b) => d3.ascending(a, b));

        const xScale = d3
            .scaleBand<number>()
            .domain(years)
            .padding(0.05)
            .range([0, svgWidth - margins.left - margins.right]);

        const barWidth = xScale.bandwidth();

        svg.select(".streamYLabel")
            .attr("transform",`translate(${svgWidth - margins.right },${margins.top + streamHeight/2}) rotate(-90)`)
            .attr("font-size",fontSize)
            .style("dominant-baseline","middle")
            .attr("fill",COLORS.midgrey)
            .attr("font-weight","normal")
            .attr("text-anchor","middle")
            .text("all datasets");

        svg.select(".missingBarLabel")
            .attr("transform",`translate(${svgWidth - margins.right },${svgHeight - margins.bottom})`)
            .attr("font-size",fontSize)
         //   .style("dominant-baseline","middle")
            .attr("fill",COLORS.midgrey)
            .attr("font-weight","normal")
            .attr("text-anchor","end")
            .text("MISSING data");

        const xAxis = svg.select<SVGGElement>(".xAxis");

        xAxis
            .call(d3.axisBottom(xScale).tickSizeOuter(0))
            .attr(
                "transform",
                `translate(${margins.left},${margins.top + streamHeight})`
            );

        xAxis.selectAll("path").attr("display", "none");

        xAxis.selectAll("line").attr("display", "none");

        xAxis
            .selectAll<SVGTextElement, number>("text")
            .attr("pointer-events", "none")
            .attr("font-weight", 300)
            .attr("fill", COLORS.darkgrey)
            .attr("y", fontSize * 0.3)
            .style("dominant-baseline", "middle")
            .attr("font-size", fontSize * 0.6)
            .text((d, i) =>  d % 5 === 0 || d === 2022? d : "");

        const barYMax = d3.max(progressData, (d) => d.missing) || 0;

        const barYScale = d3
            .scaleLinear()
            .domain([0, barYMax])
            .range([0, missingHeight]);

        const missingBarGroup = svg.select(".chartGroup")
            .selectAll(".missingBarGroup")
            .data(progressData)
            .join((group) => {
                const enter = group.append("g").attr("class", "missingBarGroup");
                enter.append("rect").attr("class", "missingBar");
                return enter;
            });

        missingBarGroup.attr(
            "transform",
            `translate(${margins.left},${margins.top + streamHeight + margins.middle})`
        );

        missingBarGroup
            .select(".missingBar")
            .attr("x", (d) => xScale(d.year) || 0)
            .attr("width", barWidth)
            .attr("fill", COLOR_SCALE["missing"])
            .attr("height", (d) => barYScale(d.missing));

        svg.select(".missingOverlay")
            .attr("width", svgWidth - margins.left - margins.right - (xScale(2027) || 0))
            .attr("height", missingHeight)
            .attr("fill", "white")
            .attr("fill-opacity", 0.9)
            .attr(
                "transform",
                `translate(${margins.left + (xScale(2026) || 0)},${
                    margins.top + streamHeight + margins.middle
                })`
            );

        const streamKeys = Object.keys(COLOR_SCALE).filter((f) => f !== "missing");

        const series = d3
            .stack<ProgressDataEntry>()
            .offset(d3.stackOffsetSilhouette)
            .keys(streamKeys)(
                progressData
            )

        const yExtent = d3.extent(series.flat(2));
        const streamYScale = d3
            .scaleLinear()
            .domain([yExtent[0] || 0, yExtent[1] || 0])
            .range([streamHeight, 0]);

        // Construct an area shape.
        const area = d3
            .area<d3.SeriesPoint<ProgressDataEntry>>()
            .curve(d3.curveCardinal)
            .x((d) => xScale(d.data.year) || 0)
            .y0((d) => streamYScale(d[0]))
            .y1((d) => streamYScale(d[1]));

        const pathGroup = svg.select(".chartGroup")
            .selectAll(".pathGroup")
            .data(series)
            .join((group) => {
                const enter = group.append("g").attr("class", "pathGroup");
                enter.append("path").attr("class", "streamPath");
                return enter;
            });

        pathGroup
            .select(".streamPath")
            .attr("fill", (d) => COLOR_SCALE[d.key as keyof  typeof COLOR_SCALE])
            .attr("d", area)
            .attr("transform", `translate(${margins.left},${margins.top})`);

        svg.select(".streamOverlay")
            .attr("width", svgWidth - margins.left - margins.right - (xScale(2027) || 0))
            .attr("height", streamHeight)
            .attr("fill", "white")
            .attr("fill-opacity", 0.9)
            .attr(
                "transform",
                `translate(${margins.left + (xScale(2026) || 0)},${margins.top})`
            );




    }, [progressData,tick])
    return (

        <svg ref={ref}>
            <text className={"dataTitle"}></text>
            <text className={"datasetsCount"}></text>
            <g className={"xAxis"}></g>
            <g className={"chartGroup"}></g>
            <g className={"legendGroup"}></g>
            <rect className={"missingOverlay"}></rect>
            <rect className={"streamOverlay"}></rect>
            <text className={"streamYLabel"}></text>
            <text className={"missingBarLabel"}></text>
        </svg>
    );
}


export default ProgressPanel;
