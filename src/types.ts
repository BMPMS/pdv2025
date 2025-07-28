export type Country = {
    "Country name":string;
    ISOCode:string;
    Population:number;
    Region:string;
    landMass: number;
}

export type Boundary = {
    iso: string;
    centroid: number[];
    radius: number;
    dataPoint: Country ;
}
export type Theme = {
    theme:string;
    index: number;
    fill: string;
    indicators: string[];
    goals: any;
}

export type Indicator = {
    indicator: string;
    indicatorName: string;
    targets:  any;
    type: string;
    themeGoals : {themeIndex: number, goal: number}[]
}

export type DataEntry = {
    indicator: string;
    iso2: string;
    SEX: string;
    URBANIZATION: string;
    EDUCATION: string | number;
    OCCUPATION: number | string;
    COMPOSITE_BREAKDOWN: string;
    TIME_PERIOD: number;
    VALUE: number | string;
    UNIT: string;
}

export type Target = {
    needsAttention: number;
    target: number;
    stretch: number;
}
export type TimeData = {
    year: number;
    value: number;
}

export type FormattedData = {
    indicator: string;
    type: string;
    data: DataResult[];

}

export type DataResult = {
    country: string;
    data: string | number | TimeData[];
    targetResult: string;
}

// written by Perplexity
// ---- GeoJSON Geometry Types ----
type Position = [number, number] | [number, number, number];

interface Point {
    type: "Point";
    coordinates: Position;
}
interface MultiPoint {
    type: "MultiPoint";
    coordinates: Position[];
}
interface LineString {
    type: "LineString";
    coordinates: Position[];
}
interface MultiLineString {
    type: "MultiLineString";
    coordinates: Position[][];
}
interface Polygon {
    type: "Polygon";
    coordinates: Position[][];
}
interface MultiPolygon {
    type: "MultiPolygon";
    coordinates: Position[][][];
}

type Geometry = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon;

// ---- EEZ Feature Properties ----
interface EEZFeatureProperties {
    cat: number;
    MRGID: number;
    GeoName: string;
    MRGID_Ter1: number;
    Pol_type: string;
    MRGID_Sov1: number;
    Territory1: string;
    ISO_Ter1: string;
    Sovereign1: string;
    MRGID_Ter2: number;
    MRGID_Sov2: number;
    Territory2: string;
    ISO_Ter2: string;
    Sovereign2: string;
    MRGID_Ter3: number;
    MRGID_Sov3: number;
    Territory3: string;
    ISO_Ter3: string;
    Sovereign3: string;
    x_1: number;
    y_1: number;
    MRGID_EEZ: number;
    Area_km2: number;
    orig_ogc_f: number;
}

// ---- The Feature ----
interface EEZFeature {
    type: "Feature";
    properties: EEZFeatureProperties;
    geometry: Geometry;
}

// ---- The FeatureCollection ----
export interface EEZGeoJSON {
    type: "FeatureCollection";
    name: string;
    crs: {
        type: string;
        properties: { name: string };
    };
    features: EEZFeature[];
}
