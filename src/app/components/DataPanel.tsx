import type { FC } from "react";
import React, { useRef, useEffect} from 'react';
import {FormattedData} from "@/types";
import * as d3 from "d3";

interface DataPanelProps {
    chartData: FormattedData[];
}
const DataPanel: FC<DataPanelProps> = ({ chartData }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current) return;
        const svg = d3.select<SVGSVGElement, unknown>(ref.current);
        const svgNode = svg.node();
        if (!svgNode) return;


        const containerNode = svgNode.parentElement;
        if (!containerNode) return;
        const { clientHeight: svgHeight, clientWidth: svgWidth } =
            containerNode;
        svg.attr("width", svgWidth).attr("height", svgHeight)
            .style("background-color","orange");

    }, [chartData])
    return (
        <svg ref={ref}></svg>
    );
}


export default DataPanel;
