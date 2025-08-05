import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {Theme} from "@/types";

import * as d3 from "d3";
import {getRem} from "@/app/dataFunctions";
import {measureWidth} from "@/app/components/StatusPanel_functions";
import {COLORS} from "@/constants/constants";

interface ThemesPanelProps {
    themeData: Theme[];
    filterByTheme: (themeIndex: number ) => void;
}
const ThemesPanel: FC<ThemesPanelProps> = ({ themeData, filterByTheme }) => {

    const indicatorCount = d3.sum(themeData, (d) => d.indicators.length);
    const [tick, setTick] = useState(0);
    const [themeLabel, setThemeLabel] = useState(`All Thematic Areas - ${indicatorCount} Indicators`);
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


        const fontSize = getRem() ;
        const sideMargins = fontSize/2;
        const circlePadding = sideMargins/2;
        const themesPerRow = 7;
        const widthSpace = (svgWidth - (sideMargins * 2))/themesPerRow;
        const circleRadius = Math.min(25,(widthSpace - circlePadding)/2, svgHeight/6);


        const tabHeight = fontSize * 1.5;
        const generateLeftTabPath  = (tabWidth: number , tabHeight: number, overallWidth: number) => {
            const cornerRadius = 3;
            // Ensure the corner doesn't exceed tab dimensions
            const radius = Math.min(cornerRadius, tabHeight, tabWidth);

            const path = [
                `M 0 0`,                             // Start at top-left
                `H ${tabWidth - radius}`,           // Move right to just before the corner
                `A ${radius} ${radius} 0 0 1 ${tabWidth} ${radius}`, // Convex outer corner downward
                `V ${tabHeight}`,                   // Continue straight down
                `H ${overallWidth}`                 // Continue to the right
            ];

            return path.join(' ');
        }


        let tabWidth = measureWidth(themeLabel,fontSize) + sideMargins * 2.5;
        const labelExtra = (tabWidth + 40) < svgWidth ? " Indicators" : "";
        tabWidth =  measureWidth(themeLabel,fontSize) + sideMargins * 2.5;

        svg.select(".selectedTheme")
            .attr("pointer-events","none")
            .attr("x", tabWidth/2)
            .attr("y",svgHeight  - (tabHeight * 0.85)/2 )
            .style("dominant-baseline", "middle")
            .attr("font-size",fontSize )
            .attr("fill",COLORS.darkgrey)
            .attr("text-anchor","middle")
            .text(themeLabel);

        svg.select(".clickToFilterLabel")
            .attr("pointer-events","none")
            .attr("x", svgWidth)
            .attr("y",fontSize * 0.7 )
            .style("font-style","italic")
            .style("dominant-baseline", "middle")
            .attr("font-size",fontSize * 0.7 )
            .attr("fill",COLORS.midgrey)
            .attr("text-anchor","end")
            .text("click themes to filter");

        svg.select(".themeTabPath")
            .attr("pointer-events","none")
            .attr("fill","none")
            .attr("stroke",COLORS.lightgrey)
            .attr("stroke-width",2)
            .attr("d", generateLeftTabPath(tabWidth,tabHeight,svgWidth ))
            .attr("transform",`translate(0,${svgHeight - tabHeight - 0.5})`)

        const getThemeTransform = (d: Theme, i: number) => {
            const multiple = i;
            const transformX =  sideMargins + ((multiple % themesPerRow) + 0.5) * widthSpace;
            const transformY =(svgHeight - tabHeight)/2;
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
            .on("mousemove",(event,d) => {
                d3.selectAll<SVGGElement,Theme>(".themesGroup")
                    .attr("opacity",(t) => t.index === d.index ? 1 : 0.2);

                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6}px`)
                    .html(`<strong>${d.theme}</strong><br>${d.indicators.length} indicators`)
            })
            .on("mouseout",() => {
                d3.select(".chartTooltip").style("visibility","hidden");
                svg.selectAll<SVGGElement,Theme>(".themesGroup")
                    .interrupt()
                    .attr("opacity",resetThemeOpacity);
            })
            .on("click", (event, d) => {
                clickedNode.current = clickedNode.current === d.index ? -1 : d.index;
                svg.selectAll<SVGGElement,Theme>(".themesGroup")
                    .interrupt()
                    .attr("opacity",resetThemeOpacity);


                setThemeLabel(clickedNode.current === -1
                    ? `All Thematic Areas - ${indicatorCount} ${labelExtra}`
                    : `${d.theme} - ${d.indicators.length} ${labelExtra}`);


                filterByTheme(clickedNode.current);
            })


        themeGroup.select(".themeCircle")
            .attr("filter","url(#drop-shadow-themes)")
            .attr("r", circleRadius)
            .attr("fill","white")
            .attr("stroke-width",circleRadius/7)
            .attr("stroke","#808080")
            .attr("cursor","pointer");

        themeGroup.select(".themeLabel")
            .attr("pointer-events","none")
            .attr("text-anchor", "middle")
            .style("dominant-baseline","middle")
            .attr("font-weight",600)
            .attr("font-size",circleRadius * 1.5)
            .attr("fill",COLORS.midgrey)
            .attr("dy",circleRadius * 0.15)
            .text((d) => d.index);


    }, [themeData,tick,themeLabel,filterByTheme,indicatorCount])
    return (

        <svg ref={ref}>

            <defs>
                <filter id="drop-shadow-themes" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0.5" dy="1" stdDeviation="1.5" floodOpacity="0.1"/>
                </filter>
            </defs>
            <path className={"themeTabPath"}></path>
            <text className={"selectedTheme"}></text>
            <text className={"clickToFilterLabel"}></text>
        </svg>
    );
}


export default ThemesPanel;
