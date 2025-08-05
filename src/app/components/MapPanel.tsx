import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {Boundary, Country, EEZGeoJSON, Region} from "@/types";
import * as d3 from "d3";
import {generateRightTabPath, getBoundaryData, getRegionData} from "@/app/components/MapPanel_functions";
import {getRem} from "@/app/dataFunctions";
import {measureWidth} from "@/app/components/StatusPanel_functions";
import {COLORS} from "@/constants/constants";


interface MapPanelProps {
    countryData: Country[];
    countryGeoJson: EEZGeoJSON;
    filterByCountryOrRegion:(filterVar: string, filterType: string) => void;
}

const MapPanel: FC<MapPanelProps> = ({ countryData, countryGeoJson,filterByCountryOrRegion }) => {


    const [tick, setTick] = useState(0);
    const clickedNodes: React.RefObject<string[]>  = useRef([]);
    const [clickedLabel, setClickedLabel] = useState(`All Countries - ${countryData.length}`);

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
        let tabWidth = measureWidth(clickedLabel,fontSize) + sideMargins * 2.5;

        const labelExtra = (tabWidth + 40) < svgWidth ? " countries" : "";
        tabWidth =  measureWidth(clickedLabel,fontSize) + sideMargins * 2.5;
        const tabHeight = fontSize * 1.5;

        svg.select(".dashboardTitle")
            .attr("pointer-events","none")
            .attr("x",svgWidth - 10)
            .attr("y",fontSize * 0.3)
            .attr("font-size", fontSize * 1.6)
            .style("dominant-baseline","text-before-edge")
            .attr("fill",COLORS.black)
            .attr("font-weight",500)
            .attr("text-anchor","end")
            .text(svgWidth < measureWidth("DATASET + TARGET tracker",fontSize * 1.6) ? "DATASET tracker" :"DATASET + TARGET tracker");

        svg.select(".mapTabPath")
            .attr("pointer-events","none")
            .attr("fill","transparent")
            .attr("stroke",COLORS.lightgrey)
            .attr("stroke-width",2)
            .attr("d", generateRightTabPath(tabWidth,tabHeight,svgWidth ))
            .attr("transform",`translate(0,${svgHeight - tabHeight - 0.5})`)

        svg.select(".selectedCountryOrRegion")
            .attr("pointer-events","none")
            .attr("x",svgWidth - tabWidth/2)
            .attr("y",svgHeight  - (tabHeight * 0.85)/2 )
            .style("dominant-baseline", "middle")
            .attr("font-size", fontSize)
            .attr("fill",COLORS.darkgrey)
            .attr("text-anchor","middle")
            .text(clickedLabel);

        svg.select(".clickToFilterLabel")
            .attr("pointer-events","none")
            .attr("x", svgWidth - 10)
            .attr("y",fontSize * 2.7 )
            .style("font-style","italic")
            .style("dominant-baseline", "middle")
            .attr("font-size",fontSize * 0.7 )
            .attr("fill",COLORS.midgrey)
            .attr("text-anchor","end")
            .text("click countries or regions to filter");

        const projection = d3
            .geoIdentity()
            .reflectY(true)
            .fitSize([svgWidth, svgHeight-(tabHeight/2)], countryGeoJson);

        const path = d3.geoPath(projection);

        const {boundaryData,radiusRange,populationDensityRange} = getBoundaryData(countryGeoJson,countryData, path,fontSize);

        const legendDx = 20;
        const legendDy = svgHeight - fontSize * 1.5;

        svg.select(".legendLabel")
            .attr("pointer-events","none")
            .attr("x", legendDx)
            .attr("y", legendDy)
            .attr("text-anchor","start")
            .attr("fill",COLORS.midgrey)
            .attr("font-size",fontSize * 0.7)
            .text("Population Density");

        svg.select(".legendMetricLabel")
            .attr("pointer-events","none")
            .attr("x",  legendDx)
            .attr("y", legendDy + (fontSize * 0.7))
            .attr("text-anchor","start")
            .attr("fill",COLORS.midgrey)
            .attr("font-size",fontSize * 0.6)
            .text("people/km²");

        svg.select(".legendCircleMax")
            .attr("pointer-events","none")
            .attr("r",radiusRange[1])
            .attr("cx", legendDx + radiusRange[1])
            .attr("cy", legendDy - fontSize - radiusRange[1])
            .attr("fill","transparent")
            .attr("stroke",COLORS.lightergrey)
            .attr("stroke-width",0.75);

        svg.select(".legendLabelMax")
            .attr("pointer-events","none")
            .attr("text-anchor","middle")
            .attr("font-size",fontSize * 0.7)
            .attr("x", legendDx + radiusRange[1])
            .attr("y", legendDy - fontSize  - radiusRange[1])
            .attr("fill",COLORS.lightergrey)
            .text(d3.format(".0f")(populationDensityRange[1] || 0))


        svg.select(".legendLabelMin")
            .attr("pointer-events","none")
            .attr("text-anchor","middle")
            .attr("font-size",fontSize * 0.65)
            .attr("x", legendDx + radiusRange[1])
            .attr("y", legendDy - fontSize * 0.8 - radiusRange[0])
            .attr("fill",COLORS.lightergrey)
            .text(d3.format(".0f")(populationDensityRange[0] || 0))


        svg.select(".legendCircleMin")
            .attr("pointer-events","none")
            .attr("r",radiusRange[0])
            .attr("cx", legendDx + radiusRange[1])
            .attr("cy", legendDy - fontSize  - radiusRange[0])
            .attr("fill","transparent")
            .attr("stroke",COLORS.lightergrey)
            .attr("stroke-width",0.75);

        const resetBoundaryOpacity = (d: Boundary) =>  clickedNodes.current.length === 0 || clickedNodes.current.includes(d.iso) ? 1 : 0.2;
        const resetHullOpacity = (d: Region) =>  clickedNodes.current.length === 0 || clickedNodes.current.includes(d.region) ? 0.2 : 0;


        const boundaryHullMouseout = () => {
            svg.select(".selectedCountryOrRegion").text(clickedLabel);
            svg.selectAll<SVGPathElement,Region>(".regionHull").attr("opacity",resetHullOpacity);
            svg.selectAll<SVGCircleElement,Boundary>(".boundaryCircle").attr("fill-opacity",resetBoundaryOpacity);

        }
        const boundaryGroup = svg
            .select(".countryGroup")
            .selectAll(".boundariesGroup")
            .data(boundaryData)
            .join((group) => {
                const enter = group.append("g").attr("class", "boundariesGroup");
                enter.append("circle").attr("class", "boundaryCircle");
                const defs = enter.append("defs");
                defs
                    .append("pattern")
                    .attr("class", "nodePattern")
                    .append("svg:image")
                    .attr("class", "patternImage");

                return enter;
            });

        boundaryGroup
            .select(".nodePattern")
            .attr("id", (d, i) => `countryImage${i}`)
            .attr("width", 1)
            .attr("height", 1);

        boundaryGroup
            .select(".patternImage")
            .attr(
                "xlink:href",
                (d) =>
                    `https://hatscripts.github.io/circle-flags/flags/${d.dataPoint.ISOCode.toLowerCase()}.svg`
            )
            .attr("height", (d) => d.radius * 2)
            .attr("width", (d) => d.radius * 2);

        boundaryGroup
            .select(".boundaryCircle")
            .attr("cursor","pointer")
            .attr("filter","url(#drop-shadow-map)")
            .attr("r", (d) => d.radius)
            .attr("fill", (d, i) => `url(#countryImage${i})`)
            .on("mousemove",(event,d) => {
                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6}px`)
                    .html(d.dataPoint["Country name"])
                d3.selectAll<SVGCircleElement,Boundary>(".boundaryCircle")
                    .attr("fill-opacity",(c) => c.iso === d.iso || clickedNodes.current.includes(c.iso)? 1 : 0.2);
                d3.selectAll<SVGPathElement,Region>(".regionHull").attr("opacity",(h) => clickedNodes.current.includes(h.region) ? 0.2 : 0);
            })
            .on("mouseout",() => {
                d3.select(".chartTooltip")
                    .style("visibility","hidden");
                boundaryHullMouseout();
              })
            .on("click", (event, d) => {
                if(clickedNodes.current.length === 1 && clickedNodes.current.includes(d.iso)){
                    // this country clicked
                    clickedNodes.current = [];
                    setClickedLabel(`All Countries - ${countryData.length} ${labelExtra}`)
                    filterByCountryOrRegion("","");
                } else {
                    clickedNodes.current = [d.iso];
                    setClickedLabel(d.dataPoint["Country name"]);
                    filterByCountryOrRegion(d.iso,"Country");
                }
                boundaryHullMouseout();

            })

        // simulation to move region circles into place
        const simulation = d3
            .forceSimulation()
            .alphaDecay(0.1)
            .force("x", d3.forceX<Boundary>((d) => d.centroid[0]).strength(0.4))
            .force("y", d3.forceY<Boundary>((d) => d.centroid[1]).strength(0.4))
            .force(
                "collide",
                d3
                    .forceCollide<Boundary>()
                    .radius((d) => d.radius * 1.05)
                    .strength(1)
            );
        simulation.stop();
        simulation.nodes(boundaryData);
        simulation.tick(300); // instead of running simulation on tick, skip to tick 300 so no jittering

        // transform group
        boundaryGroup.attr("transform", (d) => `translate(${d.x},${(d.y ||0) + tabHeight/4})`);

        const regionData = getRegionData(boundaryData);

        const regionGroup = svg
            .select(".regionGroup")
            .selectAll(".regionsGroup")
            .data(regionData)
            .join((group) => {
                const enter = group.append("g").attr("class", "regionsGroup");
                enter.append("path").attr("class", "regionHull");
                return enter;
            });

        regionGroup
            .select(".regionHull")
            .attr("cursor","pointer")
            .attr("filter","url(#drop-shadow-map)")
            .attr("fill", COLORS.midgrey)
            .attr("stroke", COLORS.midgrey)
            .attr("opacity", 0.15)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 30)
            .attr("d", (d) => `M${d.hull.join("L")}Z`)
            .on("mousemove",(event,d) => {
                d3.select(".chartTooltip")
                    .style("visibility","visible")
                    .style("left",`${event.pageX + 12}px`)
                    .style("top",`${event.pageY - 6}px`)
                    .html(`${d.region} - ${d.countries.length} countries`)

                d3.selectAll<SVGPathElement,Region>(".regionHull")
                    .attr("opacity",(h) => clickedNodes.current.includes(h.region) || h.region === d.region ? 0.2 : 0);
                d3.selectAll<SVGCircleElement,Boundary>(".boundaryCircle")
                    .attr("fill-opacity", (c) => c.dataPoint.Region === d.region || clickedNodes.current.includes(c.iso) ? 1 : 0.2);
            })
            .on("mouseout",() => {
                d3.select(".chartTooltip").style("visibility","hidden");
                boundaryHullMouseout();
            })
            .on("click", (event, d) => {
                if(clickedNodes.current.includes(d.region)){
                    clickedNodes.current = [];
                    setClickedLabel(`All Countries - ${countryData.length} ${labelExtra}`)
                    filterByCountryOrRegion( "" , "");

                } else {
                    clickedNodes.current = d.countries.concat([d.region]);
                    setClickedLabel(`${d.region} - ${d.countries.length} ${labelExtra}`)
                    filterByCountryOrRegion( d.region,"Region");

                }
                boundaryHullMouseout();
            })

    }, [countryData, tick, clickedLabel, countryGeoJson,filterByCountryOrRegion])
    return (
        <svg ref={ref}>
            <defs>
                <filter id="drop-shadow-map" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0.5" dy="1" stdDeviation="1.5" floodOpacity="0.1"/>
                </filter>
            </defs>
            <text className={"dashboardTitle"}></text>
            <path className={"mapTabPath"}></path>
            <text className={"selectedCountryOrRegion"}></text>
            <text className={"clickToFilterLabel"}></text>
            <text className={"legendLabel"}></text>
            <text className={"legendMetricLabel"}></text>
            <circle className={"legendCircleMax"}></circle>
            <text className={"legendLabelMax"}></text>
            <circle className={"legendCircleMin"}></circle>
            <text className={"legendLabelMin"}></text>

            <g className={"regionGroup"}></g>
            <g className={"countryGroup"}></g>
        </svg>
    );
}


export default MapPanel;
