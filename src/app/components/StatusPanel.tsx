import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {FormattedData} from "@/types";
import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";

import {
    getMissingData,
    getSplitRoundedPolygons, getVoronoi,
    getVoronoiData,
    measureWidth
} from "@/app/components/StatusPanel_functions";
import DatasetPopup from "@/app/components/DatasetPopup";

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
            .attr("fill","#484848")
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("CURRENT STATUS");

        const legendLabels = {overStretch: "> stretch Target",
            onTarget: "on Target",
            nearTarget: "near Target",
            needsAttention: "needs attention",
            missing: "missing",
            }

        const colorScale = {
            missing: "#B0B0B0",
            needsAttention: "#d80526",
            nearTarget: "#ff980c",
            onTarget: "#6da545",
            overStretch: "#016600"
        };

        let currentX = 0;

        const legendData = Object.keys(legendLabels).reduce((acc, entry) => {
            const text = legendLabels[entry as keyof typeof legendLabels]
            const labelLength = measureWidth(text, fontSize * 0.55);
            acc.push({
                text,
                xPos: currentX,
                fill: colorScale[entry as keyof typeof colorScale]
            })
            currentX += labelLength + 15;
            return acc;
        },[] as {text: string, xPos: number,fill: string}[])

        const legendGroup = svg
            .select(".legendGroup")
            .selectAll(".legendLabelsGroup")
            .data(legendData)
            .join((group) => {
                const enter = group.append("g").attr("class", "legendLabelsGroup");
                enter.append("text").attr("class", "legendLabel");
                return enter;
            });

        legendGroup.select(".legendLabel")
            .attr("pointer-events","none")
            .attr("fill", (d) => d.fill)
            .attr("x", (d) => margins.left + d.xPos)
            .attr("y", margins.top - fontSize * 0.5)
            .style("text-anchor","start")
            .attr("font-size",fontSize * 0.55)
            .attr("font-weight",600)
            .style("dominant-baseline","middle")
            .text((d) => d.text)


        const invalidData = chartData.filter((f) => f.type === "INVALID");
        const invalidDataY = margins.right + fontSize

        svg.select(".invalidCircle")
            .attr("fill","white")
            .attr("stroke", colorScale.needsAttention)
            .attr("stroke-width",fontSize * 0.05)
            .attr("r", fontSize * 0.5)
            .attr("cx", svgWidth - margins.right - fontSize * 0.5)
            .attr("cy", invalidDataY);

        svg.select(".invalidCircleLabel")
            .attr("pointer-events","none")
            .attr("fill", colorScale.needsAttention)
            .attr("x", svgWidth - margins.right - fontSize * 0.5)
            .attr("y", invalidDataY + fontSize * 0.075)
            .style("text-anchor","middle")
            .attr("font-size",fontSize * 0.8)
            .attr("font-weight",600)
            .style("dominant-baseline","middle")
            .text("!")

         svg.select(".invalidLabel")
            .attr("fill", colorScale.needsAttention)
            .attr("x", svgWidth - margins.right - fontSize - 5)
            .attr("y", invalidDataY)
            .style("text-anchor","end")
            .attr("font-size",fontSize * 0.5)
            .attr("font-weight","normal")
            .style("dominant-baseline","middle")
            .text(`${invalidData.length} invalid datasets`)


        svg.selectAll(".invalidItem")
            .on("mousemove", (event) => {
                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6}px`)
                    .html(invalidData.map((m) => `${m.indicator}<br>`).join(""))
            })
            .on("mouseout",() => {
                d3.select(".chartTooltip")
                    .style("visibility","hidden");

            })

        const allCountries = [...new Set(chartData.map((m) => m.data.map((d) => d.country)).flat())];


        const voronoiData = getVoronoiData(chartData,allCountries);

        svg.select(".datasetsCount")
            .attr("pointer-events","none")
            .attr("x",margins.left)
            .attr("y",svgHeight - margins.bottom + fontSize * 0.2)
            .attr("font-size",fontSize * 0.9)
            .style("dominant-baseline","text-before-edge")
            .attr("fill","#484848")
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text(`${d3.sum(voronoiData, (s) => s.value)} datasets*`);

        svg.select(".datasetsCountInfo")
            .attr("pointer-events","none")
            .attr("x",margins.left)
            .attr("y",svgHeight - margins.bottom + fontSize * 1.3)
            .attr("font-size",fontSize * 0.5)
            .style("font-style","italic")
            .style("dominant-baseline","text-before-edge")
            .attr("fill","#484848")
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("* dataset count > indicator count due to disaggregation by sub sets (ie SEX) in some cases");



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
            .attr("fill", (d) => (d.depth > 1 ? "transparent" : colorScale["missing"]))
            .attr("d", (d) => d.path);

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
            .attr("fill", "#F5F5F2")
            .attr("font-size", valueFontSize)
            .text( missingData ? missingData.value : "");

        svg.select(".missingLabel")
            .attr("pointer-events","none")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", valueFontSize)
            .attr(
                "transform",
                (d) =>
                    `translate(${missingPathCentroid[0] + margins.left},${missingPathCentroid[1] + 6 + margins.top})`
            )
            .text(missingData ? missingData.value : "")
            .attr(
                "fill",
                formattedMissingData.length > 1 ? colorScale["missing"] : "white"
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
                d.depth > 1 ? "transparent" : colorScale[d.data.name as keyof typeof colorScale]
            )
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
            .attr("fill", "#F5F5F2")
            .attr("font-size", (d) => fontScale(d.data.value))
            .text((d) => d.data.value);

        nodeLabelGroup
            .select(".voronoiLabel")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => fontScale(d.data.value))
            .text((d) => d.data.value)
            .attr("fill", (d) => (d.children ? colorScale[d.data.name as keyof typeof colorScale] : "white"));



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
