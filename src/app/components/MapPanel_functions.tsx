import {Boundary, Country, EEZGeoJSON} from "@/types";
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

const iso3ToIso2Map = Object.fromEntries(
    Object.entries(iso2ToIso3Map).map(([iso2, iso3]) => [iso3, iso2])
);


export const getBoundaryData = (geoJson: EEZGeoJSON, countryData: Country[], path: d3.GeoPath<any, d3.GeoPermissibleObjects>) => {
    const radiusRange = [15, 40];
    let populationRange = d3.extent(countryData, (d) => d.Population / d.landMass)

    const boundaryByIso = Array.from(
        d3.group(geoJson.features, (g) => g.properties.ISO_Ter1)
    );
    const radiusScale = d3
        .scaleSqrt()
        .domain([populationRange[0] || 0, populationRange[1] || 0])
        .range(radiusRange)
        .clamp(true)

    return boundaryByIso.reduce((acc, entry) => {
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
                    centroid: getMidpoint(centroids),
                    radius: radiusScale(dataPoint.Population / dataPoint.landMass),
                    dataPoint
                });
            }
        }
        return acc;
    }, [] as Boundary[]);
}
