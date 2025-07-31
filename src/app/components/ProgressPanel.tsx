
import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import { ProgressDataEntry} from "@/types";

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

    useEffect(() => {
        if (!ref.current) return;
        const svg = d3.select<SVGSVGElement, unknown>(ref.current);
        const svgNode = svg.node();
        if (!svgNode) return;
        const margins = { left: 20, right: 20, top: 80, middle: 40, bottom: 60 };


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
            const filteredKeys = Object.keys(COLOR_SCALE).filter((f) => f !== "year");
            currentYearTotal = d3.sum(filteredKeys, (k) => currentYearData[k as keyof typeof currentYearData]);
        }
        if(progressData.length === 0){
            currentYearTotal = 0;
        }

        svg.select(".dataTitle")
            .attr("pointer-events","none")
            .attr("x",margins.left)
            .attr("y",fontSize)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.darkgrey)
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("PROGRESS towards goal");


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
            .range([0, svgWidth - margins.left - margins.right]);

        const barWidth = xScale.bandwidth() * 0.95;

        svg.select(".streamYLabel")
            .attr("pointer-events","none")
            .attr("transform",`translate(${svgWidth - margins.right },${margins.top + streamHeight/2}) rotate(-90)`)
            .attr("font-size",fontSize)
            .style("dominant-baseline","middle")
            .attr("fill",COLORS.midgrey)
            .attr("font-weight","normal")
            .attr("text-anchor","middle")
            .text("all datasets");

        svg.select(".missingBarLabel")
            .attr("pointer-events","none")
            .attr("transform",`translate(${svgWidth - margins.right },${svgHeight - margins.bottom})`)
            .attr("font-size",fontSize)
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
            .text((d) =>  d % 5 === 0 || d === 2022? d : "");

        const barYMax = d3.max(progressData, (d) => d.missing) || 0;

        const barYScale = d3
            .scaleLinear()
            .domain([0, barYMax])
            .range([0, missingHeight]);

        const missingBarGroup = svg.select(".barGroup")
            .selectAll(".missingBarGroup")
            .data(progressData)
            .join((group) => {
                const enter = group.append("g").attr("class", "missingBarGroup");
                enter.append("rect").attr("class", "missingBar");
                enter.append("rect").attr("class", "mouseoverBar");
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

        const drawMouseoverLabels = (year: number, labelList: {label: string, fill: string}[] ) => {


            const maxLabelWidth = d3.max(labelList, (d) => measureWidth(d.label, fontSize * 0.5)) || 0;
            svg.select(".mouseoverBackgroundRect")
                .attr("visibility","visible")
                .attr("height", labelList.length > 1 ? 5 + labelList.length * fontSize * 0.6 : 0)
                .attr("width",maxLabelWidth + 10)
                .attr("x",margins.left + (xScale(year) || 0));

            const labelGroup = svg.select(".mouseoverLabels")
                .selectAll(".mouseoverLabelsGroup")
                .data(labelList)
                .join((group) => {
                    const enter = group.append("g").attr("class", "mouseoverLabelsGroup");
                    enter.append("text").attr("class", "mouseoverLabel");
                    return enter;
                });


            labelGroup.select(".mouseoverLabel")
                .attr("pointer-events","none")
                .attr("transform",(d,i) => `translate(${(xScale(year) || 0) + margins.left + 5 - (year > 2048 ? fontSize : 0)},${5 + margins.top + (i * fontSize * 0.6)}) ${labelList.length === 1 ? "rotate(-90)" : ""}`)
                .attr("text-anchor",labelList.length === 1 ? "end" : "start")
                .attr("font-size",fontSize * 0.5)
                .style("dominant-baseline",labelList.length === 1 ? "text-before-edge" : "auto")
                .attr("fill",(d) => d.fill)
                .text((d) => d.label)



        }
        missingBarGroup
            .select(".mouseoverBar")
            .attr("x", (d) => xScale(d.year) || 0)
            .attr("y",-(margins.middle + streamHeight) )
            .attr("height",streamHeight + margins.middle + missingHeight)
            .attr("width", xScale.bandwidth())
            .attr("fill", "transparent")
            .on("mouseover",(event, d) => {
                svg.select(".mouseoverLabels").attr("visibility","visible")
                svg.select(".mouseoverYear")
                    .attr("visibility","visible")
                    .attr("x",margins.left + (xScale(d.year || 0) || 0))
                    .text(d.year);

                svg.select(".mouseoverLine")
                    .attr("visibility","visible")
                    .attr("x1",margins.left + (xScale(d.year || 0) || 0))
                    .attr("x2",margins.left + (xScale(d.year || 0) || 0));


                if(d.year > currentYear){
                    drawMouseoverLabels(d.year ,[{label: "future projections", fill: COLORS.midgrey}])
                } else {
                    const values = Object.keys(d).filter((f) => f !== "year");
                    const totalForYear = d3.sum(values, (s) => d[s as keyof typeof d] || 0)
                    const labels = values.reduce((acc, entry) => {
                        const label = `${entry} - ${d3.format(".0%")(d[entry as keyof typeof d]/totalForYear)}`
                        acc.push({
                            label,
                            fill: COLOR_SCALE[entry as keyof typeof COLOR_SCALE]
                        });
                        return acc;
                    },[] as {label: string, fill: string}[] )
                    drawMouseoverLabels(d.year,labels)
                }

            })
            .on("mouseout",() => {
                svg.select(".mouseoverBackgroundRect")
                    .attr("visibility","hidden")
                svg.select(".mouseoverLabels").attr("visibility","hidden")
                svg.select(".mouseoverLine")
                    .attr("visibility","hidden");
                svg.select(".mouseoverYear")
                    .attr("visibility","hidden");
            });

        svg.select(".missingOverlay")
            .attr("pointer-events","none")
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

        const pathGroup = svg.select(".streamGroup")
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
            .attr("pointer-events","none")
            .attr("width", svgWidth - margins.left - margins.right - (xScale(2027) || 0))
            .attr("height", streamHeight)
            .attr("fill", "white")
            .attr("fill-opacity", 0.9)
            .attr(
                "transform",
                `translate(${margins.left + (xScale(2026) || 0)},${margins.top})`
            );

        svg.select(".mouseoverLine")
            .attr("pointer-events","none")
            .attr("visibility","hidden")
            .attr("stroke",COLORS.lightgrey)
            .attr("stroke-width",1)
            .attr("y1",margins.top)
            .attr("y2",svgHeight - margins.bottom);

        svg.select(".mouseoverYear")
            .attr("pointer-events","none")
            .attr("visibility","hidden")
            .attr("font-size",fontSize * 0.5)
            .attr("text-anchor","middle")
            .attr("fill",COLORS.darkgrey)
            .attr("y",margins.top - fontSize * 0.5);

        svg.select(".mouseoverBackgroundRect")
            .attr("fill","white")
            .attr("y",5 + margins.top - (fontSize * 0.6))




    }, [progressData,tick])
    return (

        <svg ref={ref}>
            <text className={"dataTitle"}></text>
            <text className={"datasetsCount"}></text>
            <g className={"xAxis"}></g>
            <g className={"streamGroup"}></g>
            <g className={"barGroup"}></g>
            <g className={"legendGroup"}></g>
            <rect className={"missingOverlay"}></rect>
            <rect className={"streamOverlay"}></rect>
            <text className={"streamYLabel"}></text>
            <text className={"missingBarLabel"}></text>
            <text className={"mouseoverYear"}></text>
            <rect className={"mouseoverBackgroundRect"}></rect>
            <line className={"mouseoverLine"}></line>
            <g className={"mouseoverLabels"}></g>
        </svg>
    );
}


export default ProgressPanel;
