import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {FormattedData} from "@/types";
import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";
import VoronoiChart from "@/app/components/VoronoiChart";
import {dim} from "next/dist/lib/picocolors";

interface DataPanelProps {
    chartData: FormattedData[];
}
const DataPanel: FC<DataPanelProps> = ({ chartData }) => {

    const [tick, setTick] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Modified hook that returns the tick value
    useEffect(() => {
        const handleResize = () => setTick(t => t + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const ref = useRef(null);
    const margins = {left: 15, right: 15, top: 15, bottom: 15};
    const voronoiChartProportion = 0.6;
    const voronoiChartWidth = dimensions.width * voronoiChartProportion;
    const voronoiChartHeight = dimensions.height - margins.top - margins.bottom - 70;
    const voronoiChartMargins = {left:margins.left , top: margins.top + 70};

    useEffect(() => {
        if (!ref.current) return;
        const svg = d3.select<SVGSVGElement, unknown>(ref.current);
        const svgNode = svg.node();
        if (!svgNode) return;


        const containerNode = svgNode.parentElement;
        if (!containerNode) return;
        const { clientHeight, clientWidth } = containerNode;
        setDimensions({ width: clientWidth, height: clientHeight });

        svg.attr("width", dimensions.width)
            .attr("height", dimensions.height)


        const fontSize = getRem() * 1.5;

        const allCountries = [...new Set(chartData.map((m) => m.data.map((d) => d.country)).flat())];

        svg.select(".dataLine")
            .attr("y",1)
            .attr("width",dimensions.width)
            .attr("height",2)
            .attr("fill","#E8E8E8");


        svg.select(".dataTitle")
            .attr("x",margins.left)
            .attr("y",fontSize * 0.6)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill","#484848")
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text(`MISSING DATA - ${chartData.length} indicators, ${allCountries.length} countries`);


    }, [chartData, tick])
    return (
        <svg ref={ref}>
            <rect className={"dataLine"}></rect>
            <text className={"dataTitle"}></text>
            <VoronoiChart chartData={chartData} chartWidth={voronoiChartWidth} chartHeight={voronoiChartHeight} chartMargins={voronoiChartMargins}></VoronoiChart>
        </svg>
    );
}


export default DataPanel;
