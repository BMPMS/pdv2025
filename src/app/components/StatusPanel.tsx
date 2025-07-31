import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {FormattedData} from "@/types";
import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";

import {
    drawLegend,
    getMissingData,
    getSplitRoundedPolygons, getVoronoi,
    getVoronoiData,
    measureWidth,
    wrap
} from "@/app/components/StatusPanel_functions";
import DatasetPopup from "@/app/components/DatasetPopup";
import {COLOR_SCALE, COLORS, LEGEND_LABELS} from "@/constants/constants";

interface DataPanelProps {
    chartData: FormattedData[];
}
const StatusPanel: FC<DataPanelProps> = ({ chartData }) => {

    const [tick, setTick] = useState(0);
    const [isModalOpen, setModalOpen] = useState<boolean>(false);
    const [clickedIndicator, setClickedIndicator] = useState<FormattedData | undefined>(undefined);
    const closeModal = () => setModalOpen(false);

    // Modified hook that returns the tick value
    useEffect(() => {
        const handleResize = () => setTick(t => t + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const ref = useRef(null);
    const margins = {left: 15, right: 15, top: 80, bottom: 50};

    useEffect(() => {
        if (!ref.current) return;
        const svg = d3.select<SVGSVGElement, unknown>(ref.current);
        const svgNode = svg.node();
        if (!svgNode) return;

        const containerNode = svgNode.parentElement;
        if (!containerNode) return;
        const { clientHeight: svgHeight, clientWidth: svgWidth } = containerNode;

        svg.attr("width", svgWidth)
            .attr("height", svgHeight);

        const fontSize = getRem() * 1.5;

        svg.select(".dataTitle")
            .attr("pointer-events","none")
            .attr("x",margins.left)
            .attr("y",fontSize * 0.8)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.darkgrey)
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("CURRENT STATUS");


        drawLegend(svg,fontSize,margins.left, margins.top);

        const invalidData = chartData.filter((f) => f.type === "INVALID");
        const invalidDataX = margins.left;
        const invalidDataY = svgHeight - margins.bottom + fontSize;

        svg.select(".invalidCircle")
            .attr("fill","white")
            .attr("stroke", COLOR_SCALE.needsAttention)
            .attr("stroke-width",fontSize * 0.05)
            .attr("r", fontSize * 0.5)
            .attr("cx", invalidDataX + fontSize * 0.5)
            .attr("cy", invalidDataY);

        svg.select(".invalidCircleLabel")
            .attr("pointer-events","none")
            .attr("fill", COLOR_SCALE.needsAttention)
            .attr("x", invalidDataX+ fontSize * 0.5)
            .attr("y", invalidDataY + fontSize * 0.075)
            .style("text-anchor","middle")
            .attr("font-size",fontSize * 0.8)
            .attr("font-weight",600)
            .style("dominant-baseline","middle")
            .text("!")

         svg.select(".invalidLabel")
            .attr("fill", COLOR_SCALE.needsAttention)
            .attr("x", invalidDataX +  fontSize + 5)
            .attr("y", invalidDataY + 2)
            .style("text-anchor","start")
            .attr("font-size",fontSize * 0.5)
            .attr("font-weight","normal")
            .style("dominant-baseline","middle")
            .text(`${invalidData.length} invalid datasets`)


        svg.selectAll(".invalidItem")
            .attr("cursor","pointer")
            .on("mousemove", (event) => {
                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6 - (invalidData.length * 15)}px`)
                    .html(`<span style="color:${COLOR_SCALE["needsAttention"]}">${invalidData.map((m) => `${m.indicator}-${m.indicatorName}<br>`).join("")}</span>`)
            })
            .on("mouseout",() => {
                d3.select(".chartTooltip")
                    .style("visibility","hidden");

            })

        const allCountries = [...new Set(chartData.map((m) => m.data.map((d) => d.country)).flat())];
        const voronoiData = getVoronoiData(chartData,allCountries);

        const totalDatasets = d3.sum(voronoiData, (s) => s.value);
        svg.select(".datasetsCount")
            .attr("pointer-events","none")
            .attr("x",svgWidth - margins.right)
            .attr("y",fontSize * 0.8)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.black)
            .attr("font-weight",500)
            .attr("text-anchor","end")
            .text(`${totalDatasets} datasets*`);

        svg.select<SVGTextElement>(".datasetsCountInfo")
            .attr("pointer-events","none")
            .attr("transform", `translate(${svgWidth - margins.right},${svgHeight - margins.bottom + fontSize * 0.5})`)
            .attr("dy",0)
            .attr("font-size",fontSize * 0.5)
            .style("font-style","italic")
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.darkgrey)
            .attr("font-weight",500)
            .attr("text-anchor","end")
            .text("* indicators x country count - some indicators have multiple sub sets due to disaggregation by SEX, EDUCATION and more.")
            .call(wrap,svgWidth * 0.6, fontSize * 0.5);


        const valueExtent = d3.extent(voronoiData, (d) => d.value);
        const rem = getRem()

        const fontScale = d3
            .scaleLinear()
            .domain([valueExtent[0] || 0, valueExtent[1] || 0])
            .range([rem * 1.5 ,rem * 3]);

        const countryFilter = chartData.length === 0 ? "" : chartData[0].countryFilter; // the same for all rows

        const missingData = voronoiData.find((f) => f.name === "missing");
        const childrenWithData = voronoiData.filter((f) => f.name !== "missing");
        const totalValue = d3.sum(voronoiData, (s) => s.value) || 0;
        const withDataTotal = d3.sum(childrenWithData, (s) => s.value) || 0;
        const dataProportion = (withDataTotal / totalValue) * 100;
        const missingTotal = 100 - dataProportion;

        const rectangularPaths = getSplitRoundedPolygons(
            svgWidth - margins.left - margins.right,
            svgHeight - margins.top - margins.bottom,
            dataProportion,
            missingTotal
        );


        const formattedMissingData = missingData ? getMissingData(
            rectangularPaths.right as [number, number][],
            missingData
        ) : [];

        const valueFontSize = fontScale(missingData ? missingData.value : 0)
        const valueWidth = measureWidth(missingData ? String(missingData.value) : "",valueFontSize * 1.05 );

        const missingGroup = svg
            .select(".missingGroup")
            .selectAll(".missingGroup")
            .data(formattedMissingData)
            .join((group) => {
                const enter = group.append("g").attr("class", "missingGroup");
                enter.append("path").attr("class", "missingVoronoiPath");
                return enter;
            });

        missingGroup.attr("transform", `translate(${margins.left},${margins.top})`);

        missingGroup
            .select(".missingVoronoiPath")
            .attr("stroke", "#F5F5F2")
            .attr("stroke-width", (d) => (d.depth === 1 ? 0 : 0.75))
            .attr("fill", (d) => (d.depth > 1 ? "transparent" : COLOR_SCALE["missing"]))
            .attr("d", (d) => d.path)
            .on("mousemove", (event, d) => {
                let tooltipText = "";
                if(countryFilter === "multiple"){
                    tooltipText = `${d.value} datasets <span style="font-weight: bold; color:${COLOR_SCALE["missing"]};"> ${LEGEND_LABELS["missing"]} </span>(${d3.format(".0%")((d.value || 0)/totalDatasets)})`
                } else {
                    tooltipText = `<span>Indicator:</span> ${d.name}<br>Click for details`
                }
                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6}px`)
                    .html(tooltipText)
            })
            .on("mouseout", (event, d) => {
                d3.select(".chartTooltip")
                    .style("visibility","hidden")
            })
            .on("click",(event, d) => {
                if(countryFilter !== "multiple"){
                    setClickedIndicator(chartData.find((f) => f.indicator === d.name))
                    setModalOpen(true);
                }
            });

        const missingPathCentroid = d3.polygonCentroid(rectangularPaths.right as [number,number][]);

        svg.select(".missingRect")
            .attr("pointer-events","none")
            .attr("transform", `translate(${missingPathCentroid[0] + margins.left},${missingPathCentroid[1] + 6 + margins.top})`)
            .attr("width", formattedMissingData.length > 1 ? valueWidth : 0)
            .attr("x", -valueWidth / 2)
            .attr("height",  valueFontSize * 0.9)
            .attr("y",  -valueFontSize * 0.8 )
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", "white")
            .attr("font-size", valueFontSize)
            .text( missingData ? missingData.value : "");

        svg.select(".missingLabel")
            .attr("pointer-events","none")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", valueFontSize)
            .attr(
                "transform",

                    `translate(${missingPathCentroid[0] + margins.left},${missingPathCentroid[1] + 6 + margins.top})`
            )
            .text(missingData ? missingData.value : "")
            .attr(
                "fill",
                formattedMissingData.length > 1 ? COLOR_SCALE["missing"] : "white"
            );

        let allNodes = getVoronoi(childrenWithData, rectangularPaths.left as [number,number][]);

        const nodeGroup = svg
            .select(".nodesGroup")
            .selectAll(".nodeGroup")
            .data(allNodes)
            .join((group) => {
                const enter = group.append("g").attr("class", "nodeGroup");
                enter.append("path").attr("class", "voronoiPath");
                return enter;
            });

        nodeGroup.attr("transform", `translate(${margins.left},${margins.top})`);

        nodeGroup
            .select(".voronoiPath")
            .attr("cursor", countryFilter === "multiple" ? "default" : "pointer")
            .attr("d", (d: any) => `M${d.polygon.join(",")}Z`)
            .attr("stroke", "#F5F5F2")
            .attr("stroke-width", (d) => (d.depth === 1 ? 2 : 0.75))
            .attr("fill", (d) =>
                d.depth > 1 ? "transparent" : COLOR_SCALE[d.data.name as keyof typeof COLOR_SCALE]
            )
            .on("mousemove", (event, d) => {
                let tooltipText = "";
                if(countryFilter === "multiple"){
                    tooltipText = `${d.value} datasets <span style="font-weight: bold; color:${COLOR_SCALE[d.data.name as keyof typeof COLOR_SCALE]};">${LEGEND_LABELS[d.data.name as keyof typeof LEGEND_LABELS]}</span> (${d3.format(".0%")((d.value || 0)/totalDatasets)})`
                } else {
                   tooltipText = `<strong>Indicator:</strong> ${d.data.name}<br>Click for details`
                }
                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6}px`)
                    .html(tooltipText)
            })
            .on("mouseout", (event, d) => {
                d3.select(".chartTooltip")
                    .style("visibility","hidden")
            })
            .on("click",(event, d) => {
                if(countryFilter !== "multiple"){
                    setClickedIndicator(chartData.find((f) => f.indicator === d.data.name))
                    setModalOpen(true);
                }
            })

        const nodeLabelGroup = svg
            .select(".nodeLabelsGroup")
            .selectAll(".nodeLabelGroup")
            .data(allNodes.filter((f) => f.depth === 1))
            .join((group) => {
                const enter = group.append("g").attr("class", "nodeLabelGroup");
                enter.append("rect").attr("class", "voronoiLabelRect");
                enter.append("text").attr("class", "voronoiLabel");
                return enter;
            });

        nodeLabelGroup.attr("transform", (d: any) => `translate(${margins.left + d.polygon.site.x},${margins.top + d.polygon.site.y})`);

        nodeLabelGroup
            .select(".voronoiLabelRect")
            .attr("pointer-events", "none")
            .attr("width", (d) =>
                d.children ? measureWidth(String(d.data.value), fontScale(d.data.value) * 1.05) : 0
            )
            .attr(
                "x",
                (d) => -measureWidth(String(d.data.value), fontScale(d.data.value) * 1.05) / 2
            )
            .attr("height", (d) => fontScale(d.data.value) * 0.9)
            .attr("y", (d) => -fontScale(d.data.value) *  0.8)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", "white")
            .attr("font-size", (d) => fontScale(d.data.value))
            .text((d) => d.data.value);

        nodeLabelGroup
            .select(".voronoiLabel")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => fontScale(d.data.value))
            .text((d) => d.data.value)
            .attr("fill", (d) => (d.children ? COLOR_SCALE[d.data.name as keyof typeof COLOR_SCALE] : "white"));



    }, [chartData, tick])
    return (
        <>
            <DatasetPopup isOpen={isModalOpen} onClose={closeModal} data={clickedIndicator}></DatasetPopup>

            <svg ref={ref}>
            <text className={"dataTitle"}></text>
            <text className={"datasetsCount"}></text>
            <text className={"datasetsCountInfo"}></text>
            <text className={"dataTitle"}></text>
            <g className={"legendGroup"}></g>
            <g className={"nodesGroup"}></g>
            <g className={"nodeLabelsGroup"}></g>
            <g className={"missingGroup"}></g>
            <rect className={"missingRect"}></rect>
            <text className={"missingLabel"}></text>
            <circle className={"invalidItem invalidCircle"}></circle>
            <text className={"invalidItem invalidCircleLabel"}></text>
            <text className={"invalidItem invalidLabel"}></text>
         </svg>
    </>
    );
}


export default StatusPanel;
