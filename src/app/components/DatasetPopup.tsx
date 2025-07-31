import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FormattedData } from '@/types';
import {COLOR_SCALE, COLORS} from "@/constants/constants";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: FormattedData | undefined;
}

const DatasetPopup: React.FC<ModalProps> = ({ isOpen, onClose, data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !isOpen) return;
        if(!data) return;

        // chosen so works @ min dimensions
        const width = 450;
        const height = 250;
        const margins = {left: 15, right: 0, top: 10, chartTop: 70, bottom: 35};
        const svg = d3.select(svgRef.current);

        const fontSize = 10;

        svg.select(".indicator")
            .attr("pointer-events","none")
            .attr("x",10)
            .attr("y",margins.top)
            .attr("font-size", fontSize * 1.5)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.black)
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text(`${data.indicator}`);

        svg.select(".indicatorName")
            .attr("pointer-events","none")
            .attr("x",10)
            .attr("y",margins.top + (fontSize * 2))
            .attr("font-size", fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.darkgrey)
            .attr("font-weight","normal")
            .attr("text-anchor","start")
            .text(`${data.indicatorName}`);

        const chartHeight = height - margins.chartTop - margins.bottom;
        svg.select(".yAxisLabel")
            .attr("transform",`translate(${margins.left  },${margins.chartTop + chartHeight/2}) rotate(-90)`)
            .attr("font-size",fontSize * 1.5)
            .style("dominant-baseline","middle")
            .attr("fill",COLORS.midgrey)
            .attr("font-weight","normal")
            .attr("text-anchor","middle")
            .text("country count");

        let columnKeys = Object.keys(COLOR_SCALE).filter((f) => f !== "year");

        if(data.type === "YN"){
            columnKeys = columnKeys.filter((f) => f !== "nearTarget" && f !== "stretchTarget")
        }

       const getTarget =(status: string) => {
           if(data.type === "YN") {
               if(status === "needsAttention") return "N"
               if(status === "onTarget") return "Y"
               return ""
           }
           // rushing so very bad code!
           const format = data.type.includes("%") ? ".0%" : ".1~f";
           const denominator = data.type.includes("%") ? 100 : 1
           if(status === "needsAttention") return `below ${d3.format(format)(data.targets.needsAttention/denominator)}`
           if(status === "nearTarget") return `${d3.format(format)(data.targets.needsAttention/denominator)} - ${d3.format(format)(data.targets.target/denominator)}`
           if(status === "onTarget") return `${d3.format(format)(data.targets.target/denominator)} - ${d3.format(format)(data.targets.stretch/denominator)}`
           if(status === "overStretch") return `above ${d3.format(format)(data.targets.stretch/denominator)}`
           return ""
       }
        const xScale = d3.scaleBand()
            .domain(columnKeys)
            .padding(0.2)
            .range([0,width - margins.left - margins.right]);

        const barData = columnKeys.reduce((acc, entry) => {
            acc.push({
                status: entry,
                target: getTarget(entry),
                countries: (data?.countryStatus || [])
                    .filter((f) => f.status === entry)
                    .map((m) => m.ISOCode)
            })
            return acc;
        },[] as {status: string, target: string,countries: string[]}[])


            Array.from(d3.group(data?.countryStatus || [], (g) => g.status));

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(barData, (d) => d.countries.length) || 0])
            .range([chartHeight,0])

        const statusGroup = svg
            .selectAll(".statusGroups")
            .data(barData)
            .join((group) => {
                const enter = group.append("g").attr("class", "statusGroups");
                enter.append("text").attr("class", "statusLabel");
                enter.append("text").attr("class", "targetLabel");
                enter.append("rect").attr("class", "barRect");
                enter.append("text").attr("class", "barCount");
                return enter;
            });

        statusGroup.attr(
            "transform",
            `translate(${margins.left },0)`
        );

        statusGroup.select(".statusLabel")
            .attr("pointer-events","none")
            .attr("x",(d) => (xScale(d.status) || 0)+ xScale.bandwidth()/2)
            .attr("y",height - margins.bottom + fontSize * 1.5)
            .attr("font-size", fontSize)
            .attr("fill",(d) => COLOR_SCALE[d.status as keyof typeof COLOR_SCALE])
            .attr("font-weight",600)
            .attr("text-anchor","middle")
            .text((d) => d.status);

        statusGroup.select(".targetLabel")
            .attr("pointer-events","none")
            .attr("x",(d) => (xScale(d.status) || 0)+ xScale.bandwidth()/2)
            .attr("y",height - margins.bottom + fontSize * 2.8)
            .attr("font-size", fontSize)
            .attr("fill",(d) => COLOR_SCALE[d.status as keyof typeof COLOR_SCALE])
            .attr("font-weight","normal")
            .attr("text-anchor","middle")
            .text((d) => d.target);

        statusGroup.select(".barRect")
            .attr("x",(d) => (xScale(d.status) || 0))
            .attr("y",(d) => yScale(d.countries.length) + margins.chartTop)
            .attr("width",xScale.bandwidth())
            .attr("height", (d) => yScale(0) - yScale(d.countries.length))
            .attr("fill",(d) => COLOR_SCALE[d.status as keyof typeof COLOR_SCALE])


        statusGroup.select(".barCount")
            .attr("pointer-events","none")
            .attr("x",(d) => (xScale(d.status) || 0)+ xScale.bandwidth()/2)
            .attr("y",(d) => yScale(d.countries.length) + margins.chartTop - 5)
            .attr("font-size", fontSize * 2)
            .attr("fill",COLORS.darkgrey)
            .attr("font-weight",600)
            .attr("text-anchor","middle")
            .text((d) => d.countries.length);


    }, [isOpen, data]);

    return (
        <div
            className={`modal-overlay ${isOpen ? '' : 'hidden'}`}
            onClick={onClose}
        >
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <svg ref={svgRef} width={450} height={250}>
                    <text className={"indicator"}></text>
                    <text className={"indicatorName"}></text>
                    <text className={"yAxisLabel"}></text>
                    <g className={"xAxis"}></g>
                </svg>
            </div>
        </div>
    );
};

export default DatasetPopup;
