
import {Boundary, Country, EEZGeoJSON, Region} from "@/types";
import * as d3 from "d3";

const getMidpoint = (points: [number, number][]) => {

    const total = points.reduce(
        (acc, [x, y]) => [acc[0] + x, acc[1] + y],
        [0, 0]
    );

    const count = points.length;
    return [total[0] / count, total[1] / count];
}

const iso2ToIso3Map: Record<string, string> = {
        FJ: "FJI",
        NC: "NCL",
        PG: "PNG",
        SB: "SLB",
        VU: "VUT",
        GU: "GUM",
        KI: "KIR",
        MH: "MHL",
        FM: "FSM",
        NR: "NRU",
        MP: "MNP",
        PW: "PLW",
        AS: "ASM",
        CK: "COK",
        NU: "NIU",
        PN: "PCN",
        WS: "WSM",
        TK: "TKL",
        TO: "TON",
        TV: "TUV",
        WF: "WLF",
        PF: "PYF"
}

export const iso3ToIso2Map = Object.fromEntries(
    Object.entries(iso2ToIso3Map).map(([iso2, iso3]) => [iso3, iso2])
);

export const getRegionData =  (boundaryData: Boundary[]) => {
    const boundaryByRegion = Array.from(
        d3.group(boundaryData, (g) => g.dataPoint.Region)
    );
    return boundaryByRegion.reduce((acc, entry) => {
        let points = entry[1].map((m) => m.centroid);
        if (points.length <= 2) {
            points = points.concat(points);
        }
        const hullPoints = points as [number, number][];
        const hull = d3.polygonHull(hullPoints);
        if(hull){
            acc.push({
                region: entry[0],
                countries: entry[1].map((m) => m.iso),
                hull
            });
        }
        return acc;
    }, [] as Region[]);

}

export const getBoundaryData = (
    geoJson: EEZGeoJSON, countryData: Country[],
    path: d3.GeoPath<any,
        d3.GeoPermissibleObjects>,
    maxRadius: number) => {
    const radiusRange = [maxRadius/3, maxRadius];
    const populationDensityRange = d3.extent(countryData, (d) => d.Population / d.landMass)

    const boundaryByIso = Array.from(
        d3.group(geoJson.features, (g) => g.properties.ISO_Ter1)
    );
    const radiusScale = d3
        .scaleSqrt()
        .domain([populationDensityRange[0] || 0, populationDensityRange[1] || 0])
        .range(radiusRange)
        .clamp(true)

    const boundaryData =  boundaryByIso.reduce((acc, entry) => {
        const centroids = entry[1].map((m) => path.centroid(m));
        const dataPoint = countryData.find(
            (f) => iso2ToIso3Map[f.ISOCode] === entry[0]
        );
        if(dataPoint){
            if ((entry[1].length = 1)) {
                acc.push({
                    iso: entry[0],
                    centroid: centroids[0],
                    radius: radiusScale(dataPoint.Population / dataPoint.landMass),
                    dataPoint
                });
            } else {
                acc.push({
                    iso: entry[0],
                    centroid: getMidpoint(centroids) as [number, number],
                    radius: radiusScale(dataPoint.Population / dataPoint.landMass),
                    dataPoint
                });
            }
        }
        return acc;
    }, [] as Boundary[]);

    return {boundaryData,radiusRange, populationDensityRange}
}

export const generateRightTabPath = (tabWidth: number, tabHeight: number, overallWidth: number, cornerRadius = 5) =>  {
    const radius = Math.min(cornerRadius, Math.abs(tabHeight), tabWidth);
    const tabStartX = overallWidth - tabWidth;

    const path = [
        `M 0 ${tabHeight + 5}`,
        `L 0 ${tabHeight}`,                                 // Start at origin
        `H ${tabStartX}`,                        // Move to start of tab
        `V ${0 + radius}`,              // Go up to just before the top
        `A ${radius} ${radius} 0 0 1 ${tabStartX + radius} ${0}`, // Rounded convex corner (up and right)
        `H ${overallWidth}`,                      // End at top right of tab
        `L ${overallWidth} ${tabHeight + 5}`
    ];

    return path.join(' ');
}
