import React, {FC, useEffect, useRef} from 'react';
import {FormattedData} from "@/types";
import * as d3 from "d3";
import {getMissingData, getSplitRoundedPolygons, getVoronoi, getVoronoiData, measureWidth} from "@/app/components/VoronoiChart_functions";
import {getRem} from "@/app/dataFunctions";

interface VoronoiChartProps {
    chartData: FormattedData[];
    chartWidth: number;
    chartHeight: number;
    chartMargins: {left: number, top: number}
}
const VoronoiChart: FC<VoronoiChartProps> = ({ chartData, chartWidth, chartHeight,chartMargins }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current) return;
        const svg = d3.select<SVGSVGElement, unknown>(ref.current);
        const svgNode = svg.node();
        if (!svgNode) return;
        if(!chartWidth) return;

        const colorScale = {
            needsAttention: "#d80526",
            missing: "#D0D0D0",
            nearTarget: "#ff980c",
            onTarget: "#6da545",
            overStretch: "#016600"
        };
        const allCountries = [...new Set(chartData.map((m) => m.data.map((d) => d.country)).flat())];

        svg.select(".infoText")
            .text(`voronoi chart changing too  - ${chartData.length} indicators, ${allCountries.length} countries`)

        const voronoiData = getVoronoiData(chartData,allCountries);

        const valueExtent = d3.extent(voronoiData, (d) => d.value);
        const rem = getRem()

        const fontScale = d3
            .scaleLinear()
            .domain([valueExtent[0] || 0, valueExtent[1] || 0])
            .range([rem * 2,rem * 5]);

        const missingData = voronoiData.find((f) => f.name === "missing");
        const childrenWithData = voronoiData.filter((f) => f.name !== "missing");
        const totalValue = d3.sum(voronoiData, (s) => s.value) || 0;
        const withDataTotal = d3.sum(childrenWithData, (s) => s.value) || 0;
        const dataProportion = (withDataTotal / totalValue) * 100;
        const missingTotal = 100 - dataProportion;

        const rectangularPaths = getSplitRoundedPolygons(
            chartWidth,
            chartHeight,
            dataProportion,
            missingTotal
        );


        const formattedMissingData = missingData ? getMissingData(
            rectangularPaths.right as [number, number][],
            missingData
        ) : [];

         const valueFontSize = fontScale(missingData ? missingData.value : 0)
        const valueWidth = measureWidth(missingData ? String(missingData.value) : "",valueFontSize * 1.2);

        const missingGroup = svg
            .select(".missingGroup")
            .selectAll(".missingGroup")
            .data(formattedMissingData)
            .join((group) => {
                const enter = group.append("g").attr("class", "missingGroup");
                enter.append("path").attr("class", "missingVoronoiPath");
                return enter;
            });

        missingGroup.attr("transform", `translate(${chartMargins.left},${chartMargins.top})`);

        missingGroup
            .select(".missingVoronoiPath")
            .attr("stroke", "#F5F5F2")
            .attr("stroke-width", (d) => (d.depth === 1 ? 0 : 0.75))
            .attr("fill", (d) => (d.depth > 1 ? "transparent" : colorScale["missing"]))
            .attr("d", (d) => d.path);

        const missingPathCentroid = d3.polygonCentroid(rectangularPaths.right as [number,number][]);

        svg.select(".missingRect")
            .attr("transform", `translate(${missingPathCentroid[0]},${missingPathCentroid[1] + 6})`)
            .attr("width", formattedMissingData.length > 1 ? valueWidth : 0)
            .attr("x", -valueWidth / 2)
            .attr("height",  valueFontSize * 1.2)
            .attr("y",  -(valueFontSize * 1.2) * 0.8)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", "#F5F5F2")
            .attr("font-size", valueFontSize)
            .text( missingData ? missingData.value : "");

        svg.select(".missingLabel")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", valueFontSize)
            .attr(
                "transform",
                (d) =>
                    `translate(${missingPathCentroid[0]},${missingPathCentroid[1] + 6})`
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

        nodeGroup.attr("transform", `translate(${chartMargins.left},${chartMargins.top})`);

        nodeGroup
            .select(".voronoiPath")
            .attr("cursor", "pointer")
            .attr("d", (d: any) => `M${d.polygon.join(",")}Z`)
            .attr("stroke", "#F5F5F2")
            .attr("stroke-width", (d) => (d.depth === 1 ? 2 : 0.75))
            .attr("fill", (d) =>
                d.depth > 1 ? "transparent" : colorScale[d.data.name as keyof typeof colorScale]
            );

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

        nodeLabelGroup.attr("transform", `translate(${chartMargins.left},${chartMargins.top})`);

        nodeLabelGroup
            .select(".voronoiLabelRect")
            .attr("pointer-events", "none")
            .attr("width", (d) =>
                d.children ? measureWidth(String(d.data.value), fontScale(d.data.value) * 1.2) : 0
            )
            .attr(
                "x",
                (d) => -measureWidth(String(d.data.value), fontScale(d.data.value) * 1.2) / 2
            )
            .attr("height", (d) => fontScale(d.data.value) * 1.2)
            .attr("y", (d) => -(fontScale(d.data.value) * 1.2) * 0.8)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", "#F5F5F2")
            .attr("font-size", (d) => fontScale(d.data.value))
            .attr(
                "transform",
                (d: any) => `translate(${d.polygon.site.x},${d.polygon.site.y + 6})`
            )
            .text((d) => d.data.value);

        nodeLabelGroup
            .select(".voronoiLabel")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => fontScale(d.data.value))
            .attr(
                "transform",
                (d: any) => `translate(${d.polygon.site.x},${d.polygon.site.y + 6})`
            )
            .text((d) => d.data.value)
            .attr("fill", (d) => (d.children ? colorScale[d.data.name as keyof typeof colorScale] : "white"));

    },[chartWidth,chartHeight,chartData,chartMargins])

    return (
        <>
            <g ref={ref}>
                <g className={"nodesGroup"}></g>
                <g className={"nodeLabelsGroup"}></g>
                <g className={"missingGroup"}></g>
                <rect className={"missingRect"}></rect>
                <text className={"missingLabel"}></text>
            </g>
        </>
    );
};

export default VoronoiChart;
