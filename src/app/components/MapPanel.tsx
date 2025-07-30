import type { FC } from "react";
import React, {useRef, useEffect, useState} from 'react';
import {Boundary, Country, EEZGeoJSON, Region, Theme} from "@/types";
import * as d3 from "d3";
import {getBoundaryData, getRegionData} from "@/app/components/MapPanel_functions";
import {getRem} from "@/app/dataFunctions";

interface MapPanelProps {
    countryData: Country[];
    countryGeoJson: EEZGeoJSON;
    filterByCountryOrRegion:(filterVar: string, filterType: string) => void;
}

const MapPanel: FC<MapPanelProps> = ({ countryData, countryGeoJson,filterByCountryOrRegion }) => {

    const [tick, setTick] = useState(0);
    const clickedNodes: React.RefObject<string[]>  = useRef([]);
    const clickedLabel: React.RefObject<string>  = useRef("");

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

        svg.select(".dashboardTitle")
            .attr("x",svgWidth - 10)
            .attr("y",fontSize * 0.3)
            .attr("font-size", fontSize * 1.5)
            .style("dominant-baseline","text-before-edge")
            .attr("fill","#484848")
            .attr("text-anchor","end")
            .text("DATA + TARGET tracker")



        const projection = d3
            .geoIdentity()
            .reflectY(true)
            .fitSize([svgWidth, svgHeight], countryGeoJson);

        const path = d3.geoPath(projection);

        const boundaryData = getBoundaryData(countryGeoJson,countryData, path,fontSize);

        const boundaryDataMinX = d3.min(boundaryData, (d) => d.centroid[0] - d.radius);

        svg.select(".selectedCountryOrRegion")
            .attr("x",boundaryDataMinX || 10)
            .attr("y",svgHeight  - fontSize * 0.5)
            .attr("font-size", fontSize)
            .attr("fill","#484848")
            .attr("text-anchor","start")
            .text("")

        const resetBoundaryOpacity = (d: Boundary) =>  clickedNodes.current.length === 0 || clickedNodes.current.includes(d.iso) ? 1 : 0.2;
        const resetHullOpacity = (d: Region) =>  clickedNodes.current.length === 0 || clickedNodes.current.includes(d.region) ? 0.2 : 0;


        const boundaryHullMouseout = () => {
            svg.select(".selectedCountryOrRegion").text(clickedLabel.current);
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
            .on("mouseover",(event,d) => {
                d3.select(".selectedCountryOrRegion").text(`${d.dataPoint["Country name"]}`);
                d3.selectAll<SVGCircleElement,Boundary>(".boundaryCircle")
                    .attr("fill-opacity",(c) => c.iso === d.iso || clickedNodes.current.includes(c.iso)? 1 : 0.2);
                d3.selectAll<SVGPathElement,Region>(".regionHull").attr("opacity",(h) => clickedNodes.current.includes(h.region) ? 0.2 : 0);
            })
            .on("mouseout",() => {
                boundaryHullMouseout();
              })
            .on("click", (event, d) => {
                if(clickedNodes.current.length === 1 && clickedNodes.current.includes(d.iso)){
                    // this country clicked
                    clickedNodes.current = [];
                    clickedLabel.current = "";
                    filterByCountryOrRegion("","");
                } else {
                    clickedNodes.current = [d.iso];
                    clickedLabel.current = d.dataPoint["Country name"];
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
        boundaryGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);

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
            .attr("fill", "#808080")
            .attr("stroke", "#808080")
            .attr("opacity", 0.15)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 30)
            .attr("d", (d) => `M${d.hull.join("L")}Z`)
            .on("mouseover",(event,d) => {
                d3.select(".selectedCountryOrRegion").text(`${d.region} - ${d.countries.length} countries`);
                d3.selectAll<SVGPathElement,Region>(".regionHull")
                    .attr("opacity",(h) => clickedNodes.current.includes(h.region) || h.region === d.region ? 0.2 : 0);
                d3.selectAll<SVGCircleElement,Boundary>(".boundaryCircle")
                    .attr("fill-opacity", (c) => c.dataPoint.Region === d.region || clickedNodes.current.includes(c.iso) ? 1 : 0.2);
            })
            .on("mouseout",() => {
                boundaryHullMouseout();
            })
            .on("click", (event, d) => {
                if(clickedNodes.current.includes(d.region)){
                    clickedNodes.current = [];
                    clickedLabel.current = "";
                    filterByCountryOrRegion( "" , "");

                } else {
                    clickedNodes.current = d.countries.concat([d.region]);
                    clickedLabel.current = `${d.region} - ${d.countries.length} countries`;
                    filterByCountryOrRegion( d.region,"Region");

                }
                boundaryHullMouseout();
            })

    }, [countryData, tick])
    return (
        <svg ref={ref}>
            <defs>
                <filter id="drop-shadow-map" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0.5" dy="1" stdDeviation="1.5" floodOpacity="0.1"/>
                </filter>
            </defs>
            <text className={"dashboardTitle"}></text>
            <text className={"selectedCountryOrRegion"}></text>
            <g className={"regionGroup"}></g>
            <g className={"countryGroup"}></g>
        </svg>
    );
}


export default MapPanel;
