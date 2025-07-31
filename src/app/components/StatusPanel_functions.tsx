import {FormattedData, DataResult, VoronoiData} from "@/types";
// @ts-expect-error no typescript definition for voronoiTreemap
import { voronoiTreemap } from 'd3-voronoi-treemap';
import seedrandom from 'seedrandom';
import * as d3 from "d3";
import {COLOR_SCALE, LEGEND_LABELS} from "@/constants/constants";


export const getVoronoiData = (chartData: FormattedData[],allCountries:string[]) => {
    if(chartData.length === 0) return [];
    const countryFilter = chartData[0].countryFilter; // the same for all rows
    if(countryFilter === "multiple"){
        const allData = chartData.reduce((acc, entry) => {
            allCountries.forEach((country) => {
                const matchingData = entry.data.find((f) => f.country === country);
                const result = matchingData ? matchingData.targetResult : "missing";
                acc.push({
                    indicator: entry.indicator,
                    country,
                    result
                });
            });
            return acc;
        }, [] as {indicator: string, country:string, result: string}[]);

        return Array.from(d3.group(allData, (g) => g.result)).reduce((acc, entry) => {
            acc.push({
                name: entry[0],
                value: entry[1].length,
                data: entry[1]
            });
            return acc;
        }, [] as VoronoiData[]);
    }
    const allResults = chartData.reduce((acc, entry) => {
        const result =
            entry.data.length === 0 ? "missing" : entry.data[0].targetResult;
        if(entry.type !== "INVALID"){
            acc.push({
                indicator: entry.indicator,
                result,
                data: entry.data
            });
        }
        return acc;
    }, [] as {indicator: string, result: string, data: DataResult[]}[]);

    return Array.from(d3.group(allResults, (d) => d.result)).reduce(
        (acc, entry) => {
            const children = entry[1].reduce((entryAcc, child) => {
                entryAcc.push({
                    name: child.indicator,
                    value: 1,
                })
                return entryAcc;
            },[] as VoronoiData[])

            acc.push({
                name: entry[0],
                value: children.length,
                children,
            });
            return acc;
        },
        [] as VoronoiData[]
    );
}

const arcPoints = (cx: number, cy: number, r:number, startAngle: number, endAngle: number, steps = 3) => {
    const pts = [];
    const step = (endAngle - startAngle) / steps;
    for (let i = 0; i <= steps; i++) {
        const angle = startAngle + step * i;
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return pts;
}

export const getSplitRoundedPolygons = (
    width: number,
    height: number,
    percentLeft: number,
    percentRight: number,
    gap = 1.5,
    radius = 5,
    diagonalAngleDeg = 15
) => {
    const total = percentLeft + percentRight;
    const leftW = (width * percentLeft) / total;

    // Compute diagonal offset using angle
    const angleRad = (diagonalAngleDeg * Math.PI) / 180;
    const diagOffset = Math.tan(angleRad) * height;

    // Clamp if diagonal would go out of bounds
    const maxOffset = Math.min(
        leftW - radius - gap,
        width - leftW - radius - gap
    );
    const offset = Math.min(diagOffset, maxOffset);

    const topX = leftW - offset / 2;
    const bottomX = leftW + offset / 2;

    const arcSteps = 3;

    // Left polygon: top-left and bottom-left rounded
    const left = [
        ...arcPoints(radius, radius, radius, Math.PI, 1.5 * Math.PI, arcSteps), // top-left
        [topX, 0],
        [bottomX, height],
        ...arcPoints(
            radius,
            height - radius,
            radius,
            0.5 * Math.PI,
            Math.PI,
            arcSteps
        ) // bottom-left
    ];

    // Right polygon: top-right and bottom-right rounded
    const right = [
        [topX + gap, 0],
        ...arcPoints(
            width - radius,
            radius,
            radius,
            1.5 * Math.PI,
            2 * Math.PI,
            arcSteps
        ), // top-right
        ...arcPoints(
            width - radius,
            height - radius,
            radius,
            0,
            0.5 * Math.PI,
            arcSteps
        ), // bottom-right
        [bottomX + gap, height]
    ];

    return { left, right };
}

export const getVoronoi = (rootChildren: VoronoiData[], dataPoints: [number, number][]) => {
    const value = d3.sum(rootChildren, (s) => s.value);
    const root = d3.hierarchy({
        name: "root",
        children: rootChildren,
        value
    });

    root.descendants().map((m: any) => {
        m.value = m.data.value;
    });

    const rng = seedrandom('20');

    const voronoiTreemapFunction = voronoiTreemap().prng(rng).clip(dataPoints);

    voronoiTreemapFunction(root);

    return root.descendants().filter((f) => f.depth > 0);
}

export const getMissingData = (dataPoints: [number, number][], missingData: VoronoiData) => {
    if (!missingData.children) {
        return [
            {
                path: `M${dataPoints.join("L")}Z`,
                value: missingData.value,
                name: missingData.name,
                depth: 1
            }
        ];
    }

    const allData = getVoronoi([missingData], dataPoints);

    return allData.reduce((acc, entry) => {
        acc.push({
            //@ts-expect-error voronoi treemap has no typescript definition
            path: `M${entry.polygon.join(",")}Z`,
            value: entry.value || 0,
            name: entry.data.name,
            depth: entry.depth
        });
        return acc;
    }, [] as {path: string, value: number, depth: number, name: string}[]);
}

export const measureWidth = (text: string, fontSize: number) => {
    const context = document.createElement("canvas").getContext("2d");
    if(!context) return 0;
    context.font = `${fontSize}px Arial`;
    return context.measureText(text).width;
}

export const truncateTextToFit = (text: string, fontSize: number, maxWidth: number) =>  {
    const ellipsis = '…';
    if (measureWidth(text, fontSize) <= maxWidth) return text;

    let truncated = text;
    while (truncated.length > 0 && measureWidth(truncated + ellipsis, fontSize) > maxWidth) {
        truncated = truncated.slice(0, -1);
    }

    return truncated + ellipsis;
}

export const wrap = (
    text: d3.Selection<SVGTextElement, unknown, HTMLElement, undefined>,
    width: number,
    fontSize: number
): void => {
    text.each(function () {
        const textElem = d3.select(this);
        const words = textElem.text().split(/\s+/).reverse();
        let word: string | undefined;
        let line: string[] = [];
        let lineNumber = 1;
        const y = textElem.attr("y");
        const dy = 0;

        let tspan = textElem
            .text(null)
            .append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", dy)
            .attr("nothing",lineNumber)

        while ((word = words.pop())) {
            line.push(word);
            const currentText = line.join(" ");
            tspan.text(currentText);
            if (measureWidth(currentText, fontSize) > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                if (word.trim() !== "") {
                    if (tspan.text().trim() === "") {
                        tspan.text(word);
                    } else {
                        lineNumber += 1;
                        tspan = textElem
                            .append("tspan")
                            .attr("x", 0)
                            .attr("y", y)
                            .attr("dy", fontSize)
                            .text(word);
                    }
                }
            }
        }
    });
};

export const drawLegend = (
    svg:  d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    fontSize: number,
    startLeft: number,
    startTop: number) => {
    let currentX = 0;

    const legendData = Object.keys(LEGEND_LABELS).reduce((acc, entry) => {
        const text = LEGEND_LABELS[entry as keyof typeof LEGEND_LABELS]
        const labelLength = measureWidth(text, fontSize * 0.55);
        acc.push({
            text,
            xPos: currentX,
            fill: COLOR_SCALE[entry as keyof typeof COLOR_SCALE]
        })

        currentX += labelLength + 15;
        return acc;
    },[] as {text: string, xPos: number,fill: string}[])

    const legendGroup = svg
        .select(".legendGroup")
        .selectAll(".legendLabelsGroup")
        .data(legendData)
        .join((group) => {
            const enter = group.append("g").attr("class", "legendLabelsGroup");
            enter.append("text").attr("class", "legendLabel");
            return enter;
        });

    legendGroup.select(".legendLabel")
        .attr("pointer-events","none")
        .attr("fill", (d) => d.fill)
        .attr("x", (d) => startLeft + d.xPos)
        .attr("y", startTop - fontSize * 0.5)
        .style("text-anchor","start")
        .attr("font-size",fontSize * 0.55)
        .attr("font-weight",600)
        .style("dominant-baseline","middle")
        .text((d) => d.text)
}
