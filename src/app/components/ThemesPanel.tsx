import type { FC } from "react";
import React, { useRef, useEffect} from 'react';
import {Theme} from "@/types";
import * as d3 from "d3";

interface ThemesPanelProps {
    themeData: Theme[];
}
const ThemesPanel: FC<ThemesPanelProps> = ({ themeData }) => {
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
        svg.attr("width", svgWidth).attr("height", svgHeight);


        const circlePadding = 8;
        const themesPerRow = 4;
        const widthSpace = svgWidth/themesPerRow;
        const heightSpace = (svgHeight - (circlePadding * 2))/2;
        const circleSpace = Math.min(widthSpace,heightSpace);
        const circleRadius = (circleSpace - circlePadding)/2;

        svg.select(".themeTitle")
            .attr("x",5)
            .attr("y",circlePadding + circleRadius + 2)
            .attr("font-size",14)
            .style("dominant-baseline","middle")
            .attr("font-weight",600)
            .attr("text-anchor","start")
            .text("THEMES")

        const getThemeTransform = (d: Theme, i: number) => {
            const multiple = i+1;
            const transformX =  ((multiple % themesPerRow) + 0.5) * widthSpace;
            const transformY = circlePadding  + (parseInt(String(multiple/themesPerRow))+ 0.5) * heightSpace;
            return `translate(${transformX},${transformY})`
        }
        const themeGroup =  svg
            .selectAll(".themesGroup")
            .data(themeData)
            .join((group) => {
                const enter = group.append("g").attr("class", "themesGroup");
                enter.append("circle").attr("class", "themeCircle");
                enter.append("text").attr("class", "themeLabel");
                return enter;
            });

        themeGroup.attr("transform",getThemeTransform)

        themeGroup.select(".themeCircle")
            .attr("filter","url(#drop-shadow)")
            .attr("r", circleRadius)
            .attr("fill", (d) => d.fill)
            .attr("cursor","pointer")
            .on("mouseover",(event) => {
                d3.selectAll(".themeCircle").interrupt().attr("fill-opacity",1);
                d3.select(event.currentTarget)
                    .interrupt()
                    .transition()
                    .duration(100)
                    .attr("fill-opacity",0.7);
            })
            .on("mouseout",() => {
                d3.selectAll(".themeCircle").interrupt().attr("fill-opacity",1);
            })

        themeGroup.select(".themeLabel")
            .attr("pointer-events","none")
            .attr("text-anchor", "middle")
            .style("dominant-baseline","middle")
            .attr("font-weight",600)
            .attr("font-size",30)
            .attr("fill","white")
            .attr("dy",3)
            .text((d) => d.index);


    }, [themeData])
    return (
        <svg ref={ref}>

            <defs>
                <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="3" stdDeviation="4" flood-opacity="0.2"/>
                </filter>
            </defs>
            <text className={"themeTitle"}></text>
        </svg>
    );
}


export default ThemesPanel;
