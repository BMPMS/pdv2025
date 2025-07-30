import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {FormattedData, Theme} from "@/types";

import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";
import {measureWidth} from "@/app/components/StatusPanel_functions";
interface ProgressPanelProps {
    chartData: FormattedData[];
}
const ProgressPanel: FC<ProgressPanelProps> = ({ chartData }) => {
    const [tick, setTick] = useState(0);

    // Modified hook that returns the tick value
    useEffect(() => {
        const handleResize = () => setTick(t => t + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const ref = useRef(null);
    const margins = {left: 15, right: 15, top: 15, bottom: 15};

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
        const sideMargins = fontSize/2;

        svg.select(".dataTitle")
            .attr("x",margins.left)
            .attr("y",fontSize)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill","#484848")
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("PROGRESS towards goal");

    }, [chartData,tick])
    return (

        <svg ref={ref}>
            <text className={"dataTitle"}></text>
        </svg>
    );
}


export default ProgressPanel;
