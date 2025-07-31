import {Country, CountryStatus, DataEntry, DataResult, FormattedData, Indicator, Target, TimeData} from "@/types";
import * as d3 from "d3";
import themeData from "@/app/data/allThemes.json";
import {iso3ToIso2Map} from "@/app/components/MapPanel_functions";

export const getFilteredChartData = (
    selectedTheme: number,
    selectedCountryOrRegion: string,
    allChartData: FormattedData[],
    countryMapper: {[key: string] : string[]}) => {
    // first filter the indicators by theme if needed
    const matchingTheme = themeData.find((f) => f.index === selectedTheme);
    const filteredIndicators = matchingTheme ?
        allChartData.filter((f) => matchingTheme.indicators.includes(f.indicator))
        : allChartData;
    const [filterVar, filterType] = selectedCountryOrRegion.split("|");
    const filterCountries = filterType === "Region" ? countryMapper[filterVar] : [iso3ToIso2Map[filterVar]];


    return filteredIndicators.reduce((acc, entry) => {
        const filteredData = entry.data.filter((f) => filterCountries.includes(f.country));
        const indicatorData = selectedCountryOrRegion === "|" ? entry.data : filteredData;
        acc.push({
            countryFilter: filterType === "Country" ? filterVar : "multiple",
            indicator: entry.indicator,
            indicatorName: entry.indicatorName,
            targets: entry.targets,
            type: entry.type,
            countryStatus: entry.countryStatus,
            data: indicatorData
        })
        return acc;
    }, [] as FormattedData[])
}
export const getRem = () => parseFloat(getComputedStyle(document.documentElement).fontSize)
const getTargetScale = (target: Target) => {
    if(target.needsAttention > target.stretch){
        return  d3
            .scaleThreshold<number, string>()
            .domain([target.stretch, target.target, target.needsAttention])
            .range(["overStretch", "onTarget", "nearTarget", "needsAttention"]);
    }
    return   d3
        .scaleThreshold<number, string>()
        .domain([target.needsAttention, target.target, target.stretch])
        .range(["needsAttention", "nearTarget", "onTarget", "overStretch"]);
}
const getDataResults = (indicatorType: string, targets: Target, matchingData: DataEntry[]) => {
    const byCountry = Array.from(d3.group(matchingData, (g) => g.iso2));
    return byCountry.reduce((acc,entry) => {
        const timeData = entry[1].reduce((dataAcc, dataEntry) => {
            if(typeof  dataEntry.VALUE === "number"){
                dataAcc.push({
                    year: dataEntry.TIME_PERIOD,
                    value: dataEntry.VALUE
                })
            }
            return dataAcc;
        },[] as TimeData[])
            .sort((a,b) => d3.ascending(a.year, b.year));
        if(indicatorType === "time" || indicatorType === "%" || indicatorType === "#"){
            const targetScale = getTargetScale(targets);
            acc.push({
                country: entry[0],
                data: indicatorType === "time" ? timeData : timeData.length === 0 ? "missing" : timeData[timeData.length - 1].value,
                targetResult: timeData.length === 0 ? "missing" : targetScale(timeData[timeData.length - 1].value)
            })
        } else if (indicatorType === "YN"){
            acc.push({
                country: entry[0],
                data: timeData.some((s) => +s.value === 1) ? "onTarget" : "needsAttention",
                targetResult: timeData.some((s) => +s.value === 1) ? "onTarget" : "needsAttention",
            })
        }
        return acc;
    }, [] as DataResult[])
}
const getCountryStatus = (currentData: DataResult[],allCountryCodes: string[]) => {
    return   allCountryCodes.reduce((acc, entry) => {
        const matchingData =currentData.find((f) => f.country === entry);
        if(matchingData){
            acc.push({ISOCode: entry, status: matchingData.targetResult})
        } else {
            acc.push({ISOCode: entry, status: "missing"})
        }
        return acc;
    },[] as  CountryStatus[])
}
export const formatData = (indicatorData: Indicator[], allData: DataEntry[], allCountryCodes: string[]) => {

    const typeGroups: { [key: string]:string [] |  number[]} = {"SEX": ["M","F"], "URBANIZATION" :["U","R"]}
    const basicDataTypes = ["time","%","#", "YN"];



    return indicatorData.reduce((indicatorAcc, indicator) => {
        if(indicator.type === "INVALID"){
            indicatorAcc.push({
                countryFilter: "multiple",
                indicator: indicator.indicator,
                indicatorName: indicator.indicatorName,
                targets: indicator.targets,
                type: indicator.type,
                countryStatus: [],
                data:[]
            })
        } else {
            const matchingData = allData.filter((f) => f.indicator === indicator.indicator);
            if(basicDataTypes.includes(indicator.type)){
                const indicatorData = getDataResults(indicator.type, indicator.targets, matchingData);
                indicatorAcc.push({
                    countryFilter: "multiple",
                    indicator: indicator.indicator,
                    indicatorName: indicator.indicatorName,
                    targets:indicator.targets,
                    type: indicator.type,
                    countryStatus: getCountryStatus(indicatorData,allCountryCodes),
                    data:indicatorData
                })
            } else {
                const splitType = indicator.type.split("_");
                const actualType = splitType[0];
                const dataType = splitType.slice(1).join("_");
                let dataGroups = typeGroups[dataType];
                if(!dataGroups) {
                    if(dataType === "EDUCATION"){
                        if(Object.keys(indicator.targets).includes("needsAttention")){
                            dataGroups = [1,2,3];
                        } else {
                            dataGroups = Object.keys(indicator.targets);
                            // terrible cheat
                            matchingData.map((m) => m.EDUCATION = String(m.EDUCATION));
                        }
                    } else {
                        if(Object.keys(indicator.targets).includes("needsAttention")){
                            console.error ('issue here');
                        } else {
                            dataGroups = Object.keys(indicator.targets)
                        }
                    }

                }
                dataGroups.forEach((d) => {
                    const groupData = matchingData.filter((f) => f[dataType as keyof DataEntry] === d);
                    const targets = indicator.targets[d] ? indicator.targets[d] : indicator.targets;
                    const indicatorData = getDataResults(actualType, targets, groupData);
                    indicatorAcc.push({
                        countryFilter: "multiple",
                        indicator: `${indicator.indicator}-${d}`,
                        indicatorName: indicator.indicatorName,
                        targets,
                        type: indicator.type,
                        countryStatus: getCountryStatus(indicatorData,allCountryCodes),
                        data:indicatorData
                    })
                })
            }
        }

        return indicatorAcc;
    }, [] as FormattedData[])
}
