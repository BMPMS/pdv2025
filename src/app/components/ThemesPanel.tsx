import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {Theme} from "@/types";

import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";
interface ThemesPanelProps {
    themeData: Theme[];
    filterByTheme: (themeIndex: number ) => void;
}
const ThemesPanel: FC<ThemesPanelProps> = ({ themeData, filterByTheme }) => {
    const [tick, setTick] = useState(0);
    const clickedNode: React.RefObject<number>  = useRef(-1);

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


        const containerNode = svgNode.parentElement;
        if (!containerNode) return;
        const { clientHeight: svgHeight, clientWidth: svgWidth } =
            containerNode;
        svg.attr("width", svgWidth).attr("height", svgHeight);


        const fontSize = getRem() * 1.1;
        const sideMargins = fontSize/2;
        const circlePadding = sideMargins/2;
        const themesPerRow = 7;
        const widthSpace = (svgWidth - (sideMargins * 2))/themesPerRow;
        const circleRadius = Math.min(25,(widthSpace - circlePadding)/2, svgHeight/6);

        svg.select(".themeTitle")
            .attr("x",sideMargins + circlePadding/2)
            .attr("y",fontSize * 0.3)
            .attr("font-size",fontSize)
            .style("dominant-baseline","text-before-edge")
            .attr("fill","#484848")
            .attr("font-weight",500)
            .attr("text-anchor","start")
            .text("Thematic Areas")

        svg.select(".selectedTheme")
            .attr("x",sideMargins + circlePadding/2)
            .attr("y",svgHeight  - fontSize * 0.5)
            .attr("font-size",fontSize )
            .attr("fill","#484848")
            .attr("text-anchor","start")
            .text("")


        const getThemeTransform = (d: Theme, i: number) => {
            const multiple = i;
            const transformX =  sideMargins + ((multiple % themesPerRow) + 0.5) * widthSpace;
            const transformY = svgHeight/2;
            return `translate(${transformX},${transformY})`
        }

        const resetThemeOpacity = (d: Theme) =>  clickedNode.current === -1 || clickedNode.current === d.index ? 1 : 0.2;
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
            .on("mouseover",(event,d) => {
                d3.selectAll<SVGGElement,Theme>(".themesGroup").interrupt().attr("opacity",resetThemeOpacity);
                d3.select(event.currentTarget)
                    .interrupt()
                    .transition()
                    .duration(100)
                    .attr("opacity",1);
                svg.select(".selectedTheme").text(d.theme);
            })
            .on("mouseout",() => {
                svg.selectAll<SVGGElement,Theme>(".themesGroup")
                    .interrupt()
                    .attr("opacity",resetThemeOpacity);
                if(clickedNode.current === -1){
                    svg.select(".selectedTheme").text("");
                }
            })
            .on("click", (event, d) => {
                clickedNode.current = clickedNode.current === d.index ? -1 : d.index;
                svg.selectAll<SVGGElement,Theme>(".themesGroup")
                    .interrupt()
                    .attr("opacity",resetThemeOpacity);
                if(clickedNode.current !== -1){
                    svg.select(".selectedTheme").text(d.theme);
                }
                filterByTheme(clickedNode.current);
            })


        themeGroup.select(".themeCircle")
            .attr("filter","url(#drop-shadow-themes)")
            .attr("r", circleRadius)
            .attr("fill","white")
            .attr("stroke-width",circleRadius/7)
            .attr("stroke","#808080")
           // .attr("stroke", (d) => d.fill)
            .attr("cursor","pointer");

        themeGroup.select(".themeLabel")
            .attr("pointer-events","none")
            .attr("text-anchor", "middle")
            .style("dominant-baseline","middle")
            .attr("font-weight",600)
            .attr("font-size",circleRadius * 1.5)
           // .attr("fill",(d) => d.fill)
            .attr("fill","#808080")
            .attr("dy",circleRadius * 0.15)
            .text((d) => d.index);


    }, [themeData,tick])
    return (
        <svg ref={ref}>

            <defs>
                <filter id="drop-shadow-themes" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0.5" dy="1" stdDeviation="1.5" floodOpacity="0.1"/>
                </filter>
            </defs>
            <text className={"themeTitle"}></text>
            <text className={"selectedTheme"}></text>
        </svg>
    );
}


export default ThemesPanel;
