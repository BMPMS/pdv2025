import type { FC } from "react";
import React, { useRef, useEffect} from 'react';
import {Country, EEZGeoJSON} from "@/types";
import * as d3 from "d3";
import {getBoundaryData} from "@/app/components/MapPanel_functions";

interface MapPanelProps {
    countryData: Country[];
    countryGeoJson: EEZGeoJSON
}

const MapPanel: FC<MapPanelProps> = ({ countryData, countryGeoJson }) => {
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

        const projection = d3
            .geoIdentity()
            .reflectY(true)
            .fitSize([svgWidth, svgHeight], countryGeoJson);

        const path = d3.geoPath(projection);

        const boundaryData = getBoundaryData(countryGeoJson,countryData, path);

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
            .attr("filter","url(#drop-shadow)")
            .attr("r", (d) => d.radius)
            .attr("fill", (d, i) => `url(#countryImage${i})`)
            .on("mouseover",(event) => {
                d3.selectAll(".boundaryCircle").interrupt().attr("fill-opacity",1);
                d3.select(event.currentTarget)
                    .interrupt()
                    .transition()
                    .duration(100)
                    .attr("fill-opacity",0.7);
            })
            .on("mouseout",() => {
                d3.selectAll(".boundaryCircle").interrupt().attr("fill-opacity",1);
            });

        // simulation to move region circles into place
        const simulation = d3
            .forceSimulation()
            .alphaDecay(0.1)
            .force("x", d3.forceX((d) => d.centroid[0]).strength(0.4))
            .force("y", d3.forceY((d) => d.centroid[1]).strength(0.4))
            .force(
                "collide",
                d3
                    .forceCollide()
                    .radius((d) => d.radius * 1.05)
                    .strength(1)
            );
        simulation.stop();
        simulation.nodes(boundaryData);
        simulation.tick(300); // instead of running simulation on tick, skip to tick 300 so no jittering

        // transform group
        boundaryGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);

        const boundaryByRegion = Array.from(
            d3.group(boundaryData, (g) => g.dataPoint.Region)
        );

        const regionData = boundaryByRegion.reduce((acc, entry) => {
            let points: [number,number][] = entry[1].map((m) => m.centroid);
            if (points.length <= 2) {
                points = points.concat(points);
            }
            acc.push({
                region: entry[0],
                hull: d3.polygonHull(points)
            });
            return acc;
        }, [] as {region: string, hull: [number, number][]});

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
            .attr("fill", "#808080")
            .attr("stroke", "#808080")
            .attr("opacity", 0.15)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 30)
            .attr("d", (d) => `M${d.hull.join("L")}Z`);

    }, [countryData])
    return (
        <svg ref={ref}>
            <defs>
                <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="3" stdDeviation="4" flood-opacity="0.2"/>
                </filter>
            </defs>
            <g className={"regionGroup"}></g>
            <g className={"countryGroup"}></g>
        </svg>
    );
}


export default MapPanel;
